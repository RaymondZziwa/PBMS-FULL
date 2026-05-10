// src/events/events.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GenericResponse } from 'src/utils/genericResponse';
import {
  generateReservationCode,
  generateTicketCode,
} from 'src/utils/ticketCodeGenerator';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EventPaymentStatus, TicketStatus } from '@prisma/client';
import {
  CreateEventDto,
  UpdateEventDto,
  CreateEventParticipantDto,
  CompleteTicketPaymentDto,
} from 'src/dto/event.dto';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // Event CRUD Operations
  async create(createEventDto: CreateEventDto): Promise<GenericResponse> {
    await this.prisma.event.create({
      data: {
        title: createEventDto.title,
        description: createEventDto.description,
        startDate: new Date(createEventDto.startDate),
        endDate: new Date(createEventDto.endDate),
        ticketPrice: createEventDto.ticketPrice,
        capacity: createEventDto.capacity,
        location: createEventDto.location,
        walletId: createEventDto.walletId,
      },
    });

    return {
      status: 200,
      data: [],
      message: 'Event created successfully',
    };
  }

  async findAll() {
    const events = await this.prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { EventParticipant: true },
        },
        EventParticipant: true,
      },
    });

    return {
      status: 200,
      data: events,
      message: 'Events fetched successfully',
    };
  }

  async findOne(id: number) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        EventParticipant: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return {
      status: 200,
      data: event,
      message: 'Event fetched successfully',
    };
  }

  async update(id: number, data: UpdateEventDto) {
    try {
      if (data.startDate) {
        data.startDate = new Date(data.startDate);
      }
      if (data.endDate) {
        data.endDate = new Date(data.endDate);
      }

      await this.prisma.event.update({
        where: { id },
        data,
      });

      return {
        status: 200,
        data: [],
        message: 'Event updated successfully',
      };
    } catch (error) {
      throw new NotFoundException(error);
    }
  }

  async remove(id: number) {
    try {
      await this.prisma.event.delete({
        where: { id },
      });

      return {
        status: 200,
        data: [],
        message: 'Event deleted successfully',
      };
    } catch (error) {
      if (error) {
        throw new NotFoundException(`Event with ID ${id} not found`);
      }
      throw error;
    }
  }

  // Participant Management
  async addParticipant(eventId: number, data: CreateEventParticipantDto) {
    return await this.prisma.$transaction(async (tx) => {
      // Check if event exists
      const event = await tx.event.findUniqueOrThrow({
        where: { id: eventId },
      });

      if (!event) {
        throw new NotFoundException(`Event with ID ${eventId} not found`);
      }

      // Create participant
      const newParticipant = await tx.eventParticipant.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          tel: data.tel,
          tel2: data.tel2 || '',
          email: data.email || '',
          reservationCode: generateReservationCode(),
          eventId,
        },
        include: {
          event: {
            select: {
              title: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      });

      const ticketPrice = Number(event.ticketPrice);
      const amountPaid = Number(data.amountPaid);

      // If no payment made, return participant only
      if (amountPaid <= 0) {
        return {
          status: 201,
          data: newParticipant,
          message:
            'Participant registered successfully. No ticket generated because no payment was made.',
        };
      }

      // JWT payload
      const payload = {
        sub: newParticipant.id,
        event: event.id,
      };

      // Generate token
      const ticketToken = this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '500d',
      });

      // Create ticket
      const ticket = await tx.ticket.create({
        data: {
          eventId,
          participantId: newParticipant.id,
          amountPaid,
          balance: ticketPrice - amountPaid,
          ticketcode: generateTicketCode(),
          ticketToken,
        },
      });

      // Create payment record
      await tx.ticketPayments.create({
        data: {
          ticketId: ticket.id,
          amount: amountPaid,
          paymentMethod: data.paymentMethod || '',
          paymentDate: new Date(),
        },
      });

      const wallet = await this.prisma.wallet.findUniqueOrThrow({
        where: { id: event?.walletId || 0 },
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            increment: amountPaid,
          },
        },
      });

      return {
        status: 201,
        data: {
          participant: newParticipant,
          ticket,
        },
        message: 'Participant registered and ticket generated successfully',
      };
    });
  }
  async getEventParticipants(eventId: number) {
    // Check if event exists
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    return this.prisma.eventParticipant.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      include: {
        event: {
          select: {
            title: true,
          },
        },
      },
    });
  }

  async getParticipant(participantId: number) {
    const participant = await this.prisma.eventParticipant.findUnique({
      where: { id: participantId },
      include: {
        event: {
          select: {
            title: true,
            startDate: true,
            endDate: true,
            location: true,
          },
        },
      },
    });

    if (!participant) {
      throw new NotFoundException(
        `Participant with ID ${participantId} not found`,
      );
    }

    return participant;
  }
  // async updateParticipant(
  //   participantId: number,
  //   updateParticipantDto: UpdateParticipantDto,
  // ) {
  //   try {
  //     // 1. Fetch existing participant
  //     const participant = await this.prisma.eventParticipant.findUnique({
  //       where: { id: participantId },
  //     });

  //     if (!participant) {
  //       throw new NotFoundException(
  //         `Participant with ID ${participantId} not found`,
  //       );
  //     }

  //     // 2. Calculate new total amountPaid
  //     const newTotalPaid = new Decimal(participant.amountPaid).plus(
  //       new Decimal(updateParticipantDto.amountPaid || 0),
  //     );
  //     // 3. Determine payment status
  //     let paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' = 'UNPAID';

  //     if (newTotalPaid === participant.balance) {
  //       paymentStatus = 'PAID';
  //     } else if (
  //       newTotalPaid > new Decimal(0) &&
  //       newTotalPaid < participant.balance
  //     ) {
  //       paymentStatus = 'PARTIALLY_PAID';
  //     } else {
  //       paymentStatus = 'UNPAID';
  //     }

  //     // 4. Update DB
  //     return await this.prisma.eventParticipant.update({
  //       where: { id: participantId },
  //       data: {
  //         ...updateParticipantDto,
  //         paymentStatus,
  //       },
  //       include: {
  //         event: {
  //           select: {
  //             title: true,
  //           },
  //         },
  //       },
  //     });
  //   } catch (error: any) {
  //     if (error) {
  //       throw new NotFoundException(error);
  //     }
  //     throw error;
  //   }
  // }

  async removeParticipant(participantId: number, eventId: number) {
    const result = await this.prisma.eventParticipant.deleteMany({
      where: {
        id: participantId,
        eventId: eventId,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException(
        `Participant with ID ${participantId} not found in event ${eventId}`,
      );
    }
  }

  // Additional useful methods
  async getUpcomingEvents() {
    return this.prisma.event.findMany({
      where: {
        startDate: {
          gte: new Date(),
        },
        status: 'OPEN',
      },
      orderBy: { startDate: 'asc' },
      include: {
        _count: {
          select: { EventParticipant: true },
        },
      },
    });
  }

  async getTickets() {
    return this.prisma.ticket.findMany({
      include: {
        event: {
          select: {
            title: true,
          },
        },
        participant: true,
      },
    });
  }

  async updateTicketStatus(
    ticketId: number,
    paymentId: number,
    status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID',
  ) {
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { paymentStatus: status },
    });

    await this.prisma.ticketPayments.update({
      where: { id: paymentId },
      data: { paymentStatus: status },
    });
  }

  async completeTicketPayment(
    eventId: number,
    ticketId: number,
    paymentData: CompleteTicketPaymentDto,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // Verify the ticket exists and belongs to the specified event
      const ticket = await tx.ticket.findFirst({
        where: {
          id: ticketId,
          eventId,
        },
        include: {
          participant: true,
          event: true,
          TicketPayments: true,
        },
      });

      if (!ticket) {
        throw new NotFoundException(
          `Ticket with ID ${ticketId} not found in event ${eventId}`,
        );
      }

      // Check if ticket is already fully paid
      if (ticket.paymentStatus === 'PAID') {
        throw new BadRequestException('Ticket is already fully paid');
      }

      const additionalAmount = paymentData.amountPaid;
      const currentTotalPaid = Number(ticket.amountPaid) + additionalAmount;
      const ticketPrice = Number(ticket.event.ticketPrice);

      // Check if payment exceeds ticket price
      if (currentTotalPaid > ticketPrice) {
        throw new BadRequestException(
          `Payment amount exceeds ticket price. Maximum allowed: ${ticketPrice - Number(ticket.amountPaid)}`,
        );
      }

      // Determine new payment status
      let newPaymentStatus: EventPaymentStatus;
      if (currentTotalPaid === ticketPrice) {
        newPaymentStatus = 'PAID';
      } else if (currentTotalPaid > 0) {
        newPaymentStatus = 'PARTIALLY_PAID';
      } else {
        newPaymentStatus = 'UNPAID';
      }

      // Update ticket with new payment information
      const updatedTicket = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          amountPaid: currentTotalPaid,
          balance: ticketPrice - currentTotalPaid,
        },
        include: {
          participant: true,
          event: {
            select: {
              title: true,
              ticketPrice: true,
            },
          },
        },
      });

      // Create payment record
      await tx.ticketPayments.create({
        data: {
          ticketId,
          amount: additionalAmount,
          paymentMethod: paymentData.paymentMethod || '',
          paymentDate: new Date(),
        },
      });

      // Update wallet balance
      const wallet = await tx.wallet.findUnique({
        where: { id: ticket.event.walletId },
      });

      if (wallet) {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: {
              increment: additionalAmount,
            },
          },
        });
      }

      return {
        status: 200,
        data: {
          ticket: updatedTicket,
          paymentStatus: newPaymentStatus,
          amountPaid: additionalAmount,
          totalPaid: currentTotalPaid,
          remainingBalance: ticketPrice - currentTotalPaid,
        },
        message: `Payment completed successfully. Ticket status: ${newPaymentStatus}`,
      };
    });
  }

  async checkReservation(reservationCode: string, eventId: number) {
    const ticket = await this.prisma.eventParticipant.findFirst({
      where: {
        reservationCode,
        eventId,
      },
    });
    return ticket;
  }

  async verifyTicket(ticketcode?: string, ticketToken?: string) {
    if (!ticketcode && !ticketToken) {
      throw new BadRequestException('Ticket code or token is required');
    }

    // Find ticket
    const ticket = await this.prisma.ticket.findFirstOrThrow({
      where: {
        OR: [
          ...(ticketcode ? [{ ticketcode }] : []),

          ...(ticketToken ? [{ ticketToken }] : []),
        ],
      },

      include: {
        participant: true,

        event: {
          select: {
            id: true,
            title: true,
            description: true,
            startDate: true,
            endDate: true,
            location: true,
            ticketPrice: true,
            status: true,
          },
        },
      },
    });

    await this.prisma.ticket.update({
      where: { id: ticket?.id },
      data: { numberOfScans: ticket?.numberOfScans + 1 },
    });

    // Ticket not found
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Optional JWT verification
    if (ticketToken) {
      try {
        this.jwtService.verify(ticketToken, {
          secret: this.configService.get<string>('JWT_SECRET'),
        });
      } catch (error) {
        throw new UnauthorizedException('Invalid or expired ticket token');
      }
    }

    // Check ticket status
    if (ticket.status === TicketStatus.CANCELLED) {
      throw new BadRequestException('Ticket has been cancelled');
    }

    if (ticket.status === TicketStatus.EXPIRED) {
      throw new BadRequestException('Ticket has expired');
    }

    return {
      status: 200,
      message: 'Ticket verified successfully',
      data: ticket,
    };
  }

  async getEventTickets(eventId: number) {
    return this.prisma.ticket.findMany({
      where: {
        eventId,
      },
      include: {
        participant: true,
        TicketPayments: true,
        event: {
          select: {
            id: true,
            title: true,
            description: true,
            startDate: true,
            endDate: true,
            location: true,
            ticketPrice: true,
            status: true,
          },
        },
      },
    });
  }

  async revokeTicket(ticketId: number) {
    return await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.CANCELLED },
    });
  }

  async getEventParticipantsWithPaymentIssues(eventId: number) {
    // Check if event exists
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // Get all participants for the event
    const allParticipants = await this.prisma.eventParticipant.findMany({
      where: { eventId },
      include: {
        Ticket: {
          include: {
            TicketPayments: true,
          },
        },
        event: {
          select: {
            title: true,
            ticketPrice: true,
          },
        },
      },
    });

    // Separate participants into two categories
    const participantsWithoutTickets = allParticipants.filter(
      (participant) => participant.Ticket.length === 0,
    );

    const participantsWithUnpaidTickets = allParticipants.filter(
      (participant) =>
        participant.Ticket.length > 0 &&
        !participant.Ticket.some((ticket) => ticket.paymentStatus === 'PAID'),
    );

    return {
      status: 200,
      data: {
        participantsWithoutTickets,
        participantsWithUnpaidTickets,
        summary: {
          totalParticipants: allParticipants.length,
          withoutTickets: participantsWithoutTickets.length,
          withUnpaidTickets: participantsWithUnpaidTickets.length,
        },
      },
      message: 'Event participants with payment issues fetched successfully',
    };
  }
}

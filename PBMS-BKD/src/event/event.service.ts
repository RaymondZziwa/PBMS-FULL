// src/events/events.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateEventDto,
  CreateEventParticipantDto,
  UpdateEventDto,
  UpdateParticipantDto,
} from 'src/dto/event.dto';
import { GenericResponse } from 'src/utils/genericResponse';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  // Event CRUD Operations
  async create(createEventDto: CreateEventDto): Promise<GenericResponse> {
    await this.prisma.event.create({
      data: {
        title: createEventDto.title,
        description: createEventDto.description,
        startDate: new Date(createEventDto.startDate),
        endDate: new Date(createEventDto.endDate),
        ticketPrice: createEventDto.ticketPrice,
        location: createEventDto.location,
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

  async findOne(id: string) {
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

  async update(id: string, data: UpdateEventDto) {
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

  async remove(id: string) {
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
  async addParticipant(eventId: string, data: CreateEventParticipantDto) {
    // Check if event exists
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    const newParticipant = await this.prisma.eventParticipant.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        tel: data.tel,
        tel2: data.tel2 || '',
        amountPaid: 0,
        balance: event.ticketPrice,
        eventId: eventId,
        paymentStatus: data.paymentStatus,
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

    return {
      status: 201,
      data: newParticipant,
      message: 'Participant saved successfully',
    };
  }

  async getEventParticipants(eventId: string) {
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

  async getParticipant(participantId: string) {
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

  async updateParticipant(
    participantId: string,
    updateParticipantDto: UpdateParticipantDto,
  ) {
    try {
      // 1. Fetch existing participant
      const participant = await this.prisma.eventParticipant.findUnique({
        where: { id: participantId },
      });

      if (!participant) {
        throw new NotFoundException(
          `Participant with ID ${participantId} not found`,
        );
      }

      // 2. Calculate new total amountPaid
      const newTotalPaid = new Decimal(participant.amountPaid).plus(
        new Decimal(updateParticipantDto.amountPaid || 0),
      );
      // 3. Determine payment status
      let paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' = 'UNPAID';

      if (newTotalPaid === participant.balance) {
        paymentStatus = 'PAID';
      } else if (
        newTotalPaid > new Decimal(0) &&
        newTotalPaid < participant.balance
      ) {
        paymentStatus = 'PARTIALLY_PAID';
      } else {
        paymentStatus = 'UNPAID';
      }

      // 4. Update DB
      return await this.prisma.eventParticipant.update({
        where: { id: participantId },
        data: {
          ...updateParticipantDto,
          amountPaid: newTotalPaid,
          paymentStatus,
        },
        include: {
          event: {
            select: {
              title: true,
            },
          },
        },
      });
    } catch (error: any) {
      if (error) {
        throw new NotFoundException(error);
      }
      throw error;
    }
  }

  async removeParticipant(participantId: string, eventId: string) {
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
}

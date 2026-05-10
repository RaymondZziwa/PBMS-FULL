import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CreateEventDto,
  CreateEventParticipantDto,
  UpdateEventDto,
  CompleteTicketPaymentDto,
  //UpdateParticipantDto,
} from 'src/dto/event.dto';
import { EventsService } from './event.service';

@Controller('api/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // ========== Event CRUD ==========
  @Post('create')
  async createEvent(@Body() createEventDto: CreateEventDto) {
    return this.eventsService.create(createEventDto);
  }

  @Get('all')
  async findAllEvents() {
    return this.eventsService.findAll();
  }

  @Get(':id')
  async findOneEvent(@Param('id') id: number) {
    return this.eventsService.findOne(id);
  }

  @Patch('modify/:id')
  async updateEvent(
    @Param('id') id: number,
    @Body() updateEventDto: UpdateEventDto,
  ) {
    return this.eventsService.update(id, updateEventDto);
  }

  @Delete('delete/:id')
  async removeEvent(@Param('id') id: number) {
    return this.eventsService.remove(id);
  }

  @Get('upcoming/all')
  async getUpcomingEvents() {
    return this.eventsService.getUpcomingEvents();
  }

  @Get('tickets/all')
  async getTickets() {
    return this.eventsService.getTickets();
  }

  @Post('tickets/verify')
  async verifyTicket(
    @Body() data: { ticketcode?: string; ticketToken?: string },
  ) {
    return this.eventsService.verifyTicket(data.ticketcode, data.ticketToken);
  }

  @Get('tickets/event/:eventId')
  async getEventTickets(@Param('eventId') eventId: string) {
    return this.eventsService.getEventTickets(parseInt(eventId));
  }

  @Post('tickets/revoke/:ticketId')
  async revokeTicket(@Param('ticketId') ticketId: string) {
    return this.eventsService.revokeTicket(parseInt(ticketId));
  }

  // @Post('tickets/make-payment')
  // async makePayment() {
  //   return this.eventsService.makePayment();
  // }

  @Post(':eventId/tickets/:ticketId/complete-payment')
  async completeTicketPayment(
    @Param('eventId') eventId: string,
    @Param('ticketId') ticketId: string,
    @Body() paymentData: CompleteTicketPaymentDto,
  ) {
    return this.eventsService.completeTicketPayment(
      parseInt(eventId),
      parseInt(ticketId),
      paymentData,
    );
  }

  @Get('tickets/check-reservation/:eventId/:reservationCode')
  async checkReservation(
    @Param('reservationCode') reservationCode: string,
    @Param('eventId') eventId: string,
  ) {
    return this.eventsService.checkReservation(
      reservationCode,
      parseInt(eventId),
    );
  }

  // ========== Participant Management ==========
  @Post(':eventId/participants')
  async addParticipant(
    @Param('eventId') eventId: string,
    @Body() data: CreateEventParticipantDto,
  ) {
    return this.eventsService.addParticipant(parseInt(eventId), data);
  }

  @Get(':eventId/participants')
  async getEventParticipants(@Param('eventId') eventId: string) {
    return this.eventsService.getEventParticipants(parseInt(eventId));
  }

  @Get(':eventId/participants/payment-issues')
  async getEventParticipantsWithPaymentIssues(
    @Param('eventId') eventId: string,
  ) {
    return this.eventsService.getEventParticipantsWithPaymentIssues(
      parseInt(eventId),
    );
  }

  @Get('participants/:participantId')
  async getParticipant(@Param('participantId') participantId: number) {
    return this.eventsService.getParticipant(participantId);
  }

  // @Patch('participants/modify/:participantId')
  // async updateParticipant(
  //   @Param('participantId') participantId: number,
  //   @Body() updateParticipantDto: UpdateParticipantDto,
  // ) {
  //   return this.eventsService.updateParticipant(
  //     participantId,
  //     updateParticipantDto,
  //   );
  // }

  @Delete(':eventId/participants/:participantId')
  async removeParticipant(
    @Param('participantId') participantId: number,
    @Param('eventId') eventId: number,
  ) {
    return this.eventsService.removeParticipant(participantId, eventId);
  }
}

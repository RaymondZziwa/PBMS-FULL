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
  UpdateParticipantDto,
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

  @Get()
  async findAllEvents() {
    return this.eventsService.findAll();
  }

  @Get(':id')
  async findOneEvent(@Param('id') id: string) {
    return this.eventsService.findOne(Number(id));
  }

  @Patch('modify/:id')
  async updateEvent(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
  ) {
    return this.eventsService.update(Number(id), updateEventDto);
  }

  @Delete('delete/:id')
  async removeEvent(@Param('id') id: string) {
    return this.eventsService.remove(Number(id));
  }

  @Get('upcoming/all')
  async getUpcomingEvents() {
    return this.eventsService.getUpcomingEvents();
  }

  // ========== Participant Management ==========
  @Post(':eventId/participants')
  async addParticipant(
    @Param('eventId') eventId: number,
    @Body() data: CreateEventParticipantDto,
  ) {
    return this.eventsService.addParticipant(eventId, data);
  }

  @Get(':eventId/participants')
  async getEventParticipants(@Param('eventId') eventId: number) {
    return this.eventsService.getEventParticipants(eventId);
  }

  @Get('participants/:participantId')
  async getParticipant(@Param('participantId') participantId: number) {
    return this.eventsService.getParticipant(participantId);
  }

  @Patch('participants/modify/:participantId')
  async updateParticipant(
    @Param('participantId') participantId: number,
    @Body() updateParticipantDto: UpdateParticipantDto,
  ) {
    return this.eventsService.updateParticipant(
      participantId,
      updateParticipantDto,
    );
  }

  @Delete(':eventId/participants/:participantId')
  async removeParticipant(
    @Param('participantId') participantId: number,
    @Param('eventId') eventId: number,
  ) {
    return this.eventsService.removeParticipant(participantId, eventId);
  }
}

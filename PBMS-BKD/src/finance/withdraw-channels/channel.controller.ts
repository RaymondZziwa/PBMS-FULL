import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ChannelService } from './channel.service';
import { CreateChannelDto, UpdateChannelDto } from './dto';

@Controller('api/channels')
export class ChannelController {
  constructor(private readonly channelService: ChannelService) {}

  @Post('create')
  create(@Body() createChannelDto: CreateChannelDto) {
    return this.channelService.create(createChannelDto);
  }

  @Get('all')
  findAll() {
    return this.channelService.findAll();
  }

  @Patch('modify/:id')
  update(@Param('id') id: number, @Body() updateChannelDto: UpdateChannelDto) {
    return this.channelService.update(id, updateChannelDto);
  }

  @Delete('delete/:id')
  remove(@Param('id') id: number) {
    return this.channelService.remove(id);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateExhibitionExpenseDto,
  UpdateExhibitionExpenseDto,
} from 'src/dto/exhibition.dto';

@Injectable()
export class ExhibitionExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateExhibitionExpenseDto) {
    // Convert date string to DateTime
    const dateIncurred = new Date(data.dateIncurred + 'T00:00:00.000Z');

    await this.prisma.exhibitionExpenses.create({
      data: {
        title: data.title,
        category: data.category,
        amount: data.amount,
        dateIncurred: dateIncurred, // Now it's a proper DateTime
        description: data.description,
        exhibitionId: data.exhibitionId,
      },
    });

    return {
      status: 201,
      data: [],
      message: 'Exhibition expense saved successfully',
    };
  }

  async findAll() {
    const expenses = await this.prisma.exhibitionExpenses.findMany({
      include: { exhibition: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      status: 200,
      data: expenses,
      message: 'Exhibition expenses fetched successfully',
    };
  }

  async findOne(id: string) {
    const expense = await this.prisma.exhibitionExpenses.findUnique({
      where: { id },
      include: { exhibition: true },
    });
    if (!expense) throw new NotFoundException('Exhibition expense not found');
    return {
      status: 201,
      data: expense,
      message: 'Exhibition expense fetched successfully',
    };
  }

  async update(id: string, data: UpdateExhibitionExpenseDto) {
    await this.findOne(id);

    // Prepare update data, handling date conversion if dateIncurred is provided
    const updateData: any = { ...data };

    if (data.dateIncurred) {
      updateData.dateIncurred = new Date(data.dateIncurred + 'T00:00:00.000Z');
    }

    const expense = await this.prisma.exhibitionExpenses.update({
      where: { id },
      data: updateData,
    });

    return {
      status: 200,
      data: expense,
      message: 'Exhibition expense updated successfully',
    };
  }
  async remove(id: string) {
    await this.findOne(id); // ensure it exists
    await this.prisma.exhibitionExpenses.delete({ where: { id } });
    return {
      status: 200,
      data: [],
      message: 'Exhibition expense deleted successfully',
    };
  }
}

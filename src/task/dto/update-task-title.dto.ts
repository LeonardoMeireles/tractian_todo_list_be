import { PartialType } from '@nestjs/mapped-types';
import { CreateTaskDto } from './create-task.dto';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateTaskTitleDto extends PartialType(CreateTaskDto) {
  @IsString()
  @IsNotEmpty()
  _id: string;

  @IsString()
  @IsOptional()
  title: string;
}

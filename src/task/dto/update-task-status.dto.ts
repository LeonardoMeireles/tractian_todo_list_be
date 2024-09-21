import { PartialType } from '@nestjs/mapped-types';
import { CreateTaskDto } from './create-task.dto';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateTaskStatusDto {
  @IsString()
  @IsNotEmpty()
  _id: string;

  @IsString()
  @IsOptional()
  parentTaskId: string;

  @IsBoolean()
  @IsNotEmpty()
  completed: boolean;
}

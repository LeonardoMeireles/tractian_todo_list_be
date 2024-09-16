import { PartialType } from '@nestjs/mapped-types';
import { CreateTaskDto } from './create-task.dto';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @IsString()
  @IsNotEmpty()
  _id: string;

  @IsString()
  @IsOptional()
  title: string;

  @IsString()
  @IsOptional()
  parentTaskId: string | null;

  @IsBoolean()
  @IsOptional()
  completed: boolean;
}

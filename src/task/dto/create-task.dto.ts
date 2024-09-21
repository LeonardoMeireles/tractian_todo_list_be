import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  parentTaskId: string | null;

  @IsString()
  @IsOptional()
  previousTaskId: string | null;

  @IsString()
  @IsOptional()
  nextTaskId: string | null;

  @IsString()
  @IsNotEmpty()
  projectId: string;
}

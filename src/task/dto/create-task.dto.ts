import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  parentTaskId: string | null;

  @IsString()
  @IsNotEmpty()
  projectId: string;
}

import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { ParseBooleanPipe } from '../common/pipes/parse-boolean.pipe';

@Controller('task')
export class TaskController {
  constructor(private readonly taskService: TaskService) {
  }

  @Post()
  async create(@Body() createTaskDto: CreateTaskDto) {
    return await this.taskService.create(createTaskDto);
  }

  @Get('/project/:projectId')
  async findOne(
    @Param('projectId') projectId: string,
    @Query('search') search: string,
    @Query('completedFilter', ParseBooleanPipe) completedFilter?: boolean,
  ) {
    return await this.taskService.getProjectInfo(projectId, search, completedFilter);
  }

  @Patch()
  async update(@Body() updateTaskDto: UpdateTaskDto) {
    return await this.taskService.updateTask(updateTaskDto);
  }

  @Patch('/status')
  async updateStatus(@Body() updateTaskStatusDto: UpdateTaskStatusDto) {
    return await this.taskService.updateTaskStatus(updateTaskStatusDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.taskService.removeTask(id);
  }
}

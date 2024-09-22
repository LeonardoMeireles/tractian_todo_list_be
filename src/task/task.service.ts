import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { CreateTaskDto } from './dto/create-task.dto';
import { Task } from './schema/task.schema';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Project } from './schema/project.schema';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';

@Injectable()
export class TaskService {
  constructor(
    @InjectModel(Task.name)
    private taskModel: Model<Task>,
    @InjectModel(Project.name)
    private projectModel: Model<Project>
  ) {
  }

  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    const relatedProject = await this.projectModel.findById(createTaskDto.projectId).exec();
    if (!relatedProject) {
      throw new BadRequestException('Invalid projectId');
    }

    const newTask = new this.taskModel(createTaskDto);
    newTask.order = 0;
    await this.taskModel.updateMany(
      {parentTaskId: newTask.parentTaskId},
      {$inc: {order: 1}}
    );
    return newTask.save();
  }

  async getAllProjectTasks(projectId: string, search: string, completedFilter?: boolean) {
    const projectObjectId = new Types.ObjectId(projectId);
    const matchStep = {projectId: projectObjectId};
    if (completedFilter !== undefined) matchStep['completed'] = completedFilter;

    const pipeline: PipelineStage[] = [
      {
        $match: matchStep,
      },
      {
        $sort: {
          order: 1, //Head of the linked list first (previousTaskId null first)
        },
      },
      // Group into an "entities" and a "hierarchy" list that is used in FE to display tasks.
      {
        $group: {
          _id: null,
          entities: {
            $push: {
              _id: {$toString: '$_id'},
              title: '$title',
              parentTaskId: {$toString: '$parentTaskId'},
              projectId: {$toString: '$projectId'},
              completed: '$completed',
              createdAt: '$createdAt',
              order: '$order',
            }
          },
          hierarchy: {
            $push: {
              parentTaskId: {$ifNull: [{$toString: '$parentTaskId'}, 'root']},
              previousTaskId: {$toString: '$previousTaskId'},
              nextTaskId: {$toString: '$nextTaskId'},
              taskId: {$toString: '$_id'}
            }
          }
        }
      },
      //Check if parentTaskId is listed in entities, if not it should act as a root in hierarchy.
      //This can happen when a subtask is returned from the fuzzy search.
      {
        $addFields: {
          hierarchy: {
            $map: {
              input: '$hierarchy',
              as: 'item',
              in: {
                parentTaskId: {
                  $cond: {
                    if: {
                      $in: ['$$item.parentTaskId', {$map: {input: '$entities', as: 'entity', in: '$$entity._id'}}]
                    },
                    then: '$$item.parentTaskId',
                    else: 'root'
                  }
                },
                taskId: '$$item.taskId'
              }
            }
          }
        }
      },
      //Turn the entities and hierarchy arrays into a hashmap
      {
        $project: {
          _id: 0,
          entities: {
            $arrayToObject: {
              $map: {
                input: '$entities',
                as: 'task',
                in: {
                  k: '$$task._id', // Task ID as key
                  v: '$$task', // Task entity
                },
              },
            },
          },
          hierarchy: {
            $arrayToObject: {
              $map: {
                input: {$setUnion: '$hierarchy.parentTaskId'}, // Unique parent IDs
                as: 'parent',
                in: {
                  k: '$$parent',
                  v: {
                    $map: {
                      input: {
                        $filter: {
                          input: '$hierarchy',
                          as: 'h',
                          cond: {$eq: ['$$h.parentTaskId', '$$parent']},
                        },
                      },
                      as: 'task',
                      in: '$$task.taskId',
                    },
                  },
                },
              },
            },
          },
        },
      },
      // Allows us to check the result of previous steps -> used to handle empty projects
      {
        $facet: {
          result: [{$limit: 1}],
        },
      },
      //Fill entities and hierarchy keys in case there are no tasks in project
      {
        $project: {
          entities: {
            $ifNull: [{$arrayElemAt: ['$result.entities', 0]}, {}], // Use empty object if no tasks
          },
          hierarchy: {
            $ifNull: [{$arrayElemAt: ['$result.hierarchy', 0]}, {root: []}], //Setup empty root hierarchy
          },
        },
      },
    ];

    if (search) {
      pipeline.unshift({
        $search: {
          index: 'default',
          text: {
            query: search ?? '',
            path: 'title',
            fuzzy: {
              maxEdits: 2,
              maxExpansions: 10
            }
          },
        },
      });
    }

    return this.taskModel.aggregate(pipeline);
  }

  async getProjectInfo(projectId: string, search: string, completedFilter?: boolean) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid projectId');
    }

    return await Promise.all([
      this.projectModel.findById(projectId).exec(),
      this.getAllProjectTasks(projectId, search, completedFilter)
    ]).then(([projectData, projectTasks]) => {
      if (!projectData) {
        throw new NotFoundException('Project not found');
      }
      return {
        ...projectData['_doc'],
        tasks: projectTasks[0]
      };
    });
  }

  async orderUpdateSameParent(parentTaskId: string, currentOrder: number, newOrder: number) {
    if (currentOrder > newOrder) {
      // Shift orders up for the affected tasks
      await this.taskModel.updateMany(
        {parentTaskId, order: {$gt: newOrder, $lt: currentOrder}},
        {$inc: {order: 1}}
      );
    } else if (currentOrder < newOrder) {
      // Shift orders down for the affected tasks
      await this.taskModel.updateMany(
        {parentTaskId, order: {$gt: currentOrder, $lt: newOrder}},
        {$inc: {order: -1}}
      );
    }
  }

  async orderUpdateNewParent(parentTaskId: string, newOrder: number) {
    await this.taskModel.updateMany(
      {parentTaskId, order: {$gte: newOrder}},
      {$inc: {order: 1}}
    );
  }

  async orderUpdateOldParent(parentTaskId: string, currentOrder: number) {
    await this.taskModel.updateMany(
      {parentTaskId, order: {$gt: currentOrder}},
      {$inc: {order: -1}}
    );
  }

  async updateTask(updateDto: UpdateTaskDto): Promise<Task> {
    if (!Types.ObjectId.isValid(updateDto._id)) {
      throw new BadRequestException('Invalid id');
    }

    const task: Task = await this.taskModel.findById(updateDto._id).exec();

    if (task.parentTaskId?.toString() !== updateDto.parentTaskId) {
      await Promise.all([
        await this.orderUpdateOldParent(task.parentTaskId?.toString(), task.order),
        await this.orderUpdateNewParent(updateDto.parentTaskId?.toString(), updateDto.order),
      ]);
    } else if (task.order !== updateDto.order) {
      await this.orderUpdateSameParent(updateDto.parentTaskId, task.order, updateDto.order);
    }
    const updatedTask = await this.taskModel.findOneAndUpdate({_id: updateDto._id}, updateDto, {new: true}).exec();
    if (!updatedTask) {
      throw new BadRequestException('Task does not exist');
    }
    return updatedTask;
  }

  async shouldUpdateParentTaskStatus(updateDto: UpdateTaskStatusDto, tasksToUpdate: string[]): Promise<void> {
    const parentTaskRes = await this.taskModel.aggregate([
      {
        $match: {_id: new Types.ObjectId(updateDto.parentTaskId)}
      },
      {
        $graphLookup: {
          from: 'tasks',
          startWith: '$_id',
          connectFromField: '_id',
          connectToField: 'parentTaskId',
          depthField: 'level',
          maxDepth: 0,
          as: 'subtasks'
        }
      },
    ]);

    const parentTask = parentTaskRes[0];
    if (!parentTask) {
      throw new NotFoundException('Parent task not found');
    }

    const pendingSubtasks = parentTask.subtasks.filter((subtask) => !subtask.completed);
    if (pendingSubtasks.length === 1 && pendingSubtasks[0]._id.toString() === updateDto._id) {
      tasksToUpdate.push(updateDto.parentTaskId);
      // Check if parentTask's parent needs to be updated
      if (parentTask.parentTaskId) {
        await this.shouldUpdateParentTaskStatus(
          {
            _id: parentTask._id.toString(),
            parentTaskId: parentTask.parentTaskId,
            completed: updateDto.completed,
          },
          tasksToUpdate,
        );
      }
    }
  }

  async updateTaskStatus(updateDto: UpdateTaskStatusDto): Promise<UpdateStatusRes> {
    if (!Types.ObjectId.isValid(updateDto._id)) {
      throw new BadRequestException('Invalid id');
    }

    if (!updateDto.completed) {
      await this.taskModel.updateOne({_id: {$in: updateDto._id}}, {completed: updateDto.completed});
      return {
        tasksUpdated: [updateDto._id],
        newStatus: updateDto.completed
      };
    }

    const taskAndSubtasks = await this.taskModel.aggregate([
      {
        $match: {_id: new Types.ObjectId(updateDto._id)}
      },
      {
        $graphLookup: {
          from: 'tasks',
          startWith: '$_id',
          connectFromField: '_id',
          connectToField: 'parentTaskId',
          depthField: 'level',
          as: 'subtasks'
        }
      },
    ]);
    const taskAndSubtasksIds = [
      taskAndSubtasks[0]._id,
      ...taskAndSubtasks[0].subtasks.map((s) => s._id)
    ];

    if (updateDto.parentTaskId) {
      await this.shouldUpdateParentTaskStatus(updateDto, taskAndSubtasksIds);
    }

    await this.taskModel.updateMany({_id: {$in: taskAndSubtasksIds}}, {completed: updateDto.completed});
    return {
      tasksUpdated: taskAndSubtasksIds,
      newStatus: updateDto.completed
    };
  }

  async removeTask(taskId: string) {
    if (!Types.ObjectId.isValid(taskId)) {
      throw new BadRequestException('Invalid id');
    }

    const tasks = await this.taskModel.aggregate([
      {
        $match: {_id: new Types.ObjectId(taskId)}
      },
      //Get all related subtasks
      {
        $graphLookup: {
          from: 'tasks',
          startWith: '$_id',
          connectFromField: '_id',
          connectToField: 'parentTaskId',
          depthField: 'level',
          as: 'subtasks'
        }
      },
    ]);

    if (!tasks[0]) {
      throw new NotFoundException('Task not found');
    }
    const subtaskIds = tasks[0].subtasks.map((s) => s._id);
    const taskIds = [
      tasks[0]._id,
      ...subtaskIds
    ];
    await this.taskModel.deleteMany({_id: {$in: taskIds}});
    return {
      deletedTask: tasks[0]._id,
      deletedSubtasks: subtaskIds
    };
  }
}
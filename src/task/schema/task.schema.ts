import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

@Schema()
export class Task extends Document {
  @Prop({required: true})
  title: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Task',
    default: null,
    index: true, // Index for faster lookups of subtasks
  })
  parentTaskId: Types.ObjectId | null;

  @Prop({required: true})
  order: number;

  @Prop({type: MongooseSchema.Types.ObjectId, ref: 'Project', required: true})
  projectId: Types.ObjectId;

  @Prop({default: false})
  completed: boolean;

  @Prop({default: Date.now})
  createdAt: Date;

}

export const TaskSchema = SchemaFactory.createForClass(Task);
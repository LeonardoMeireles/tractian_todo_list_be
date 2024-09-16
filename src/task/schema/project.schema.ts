import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';
import { Task } from './task.schema';

@Schema()
export class Project extends Document {
  @Prop({required: true})
  name: string;

  @Prop({required: true, type: MongooseSchema.Types.ObjectId, ref: 'User'})
  participants: Types.ObjectId[];
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
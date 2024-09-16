import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { Project, ProjectSchema } from '../task/schema/project.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {name: User.name, schema: UserSchema },
      {name: Project.name, schema: ProjectSchema }
    ])
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}

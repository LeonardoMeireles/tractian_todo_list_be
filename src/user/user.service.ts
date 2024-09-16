import { Injectable, NotFoundException } from '@nestjs/common';
import { LoginUserDto } from './dto/login-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
  ) {
  }

  async loginUser(login: LoginUserDto) {
    const user = await this.userModel
      .findOne({
        username: login.username,
        password: login.password
      })
      .select(['_id', 'username', 'projects'])
      .populate({
        path: 'projects',
        model: 'Project',
      });

    if (!user) {
      throw new NotFoundException('Username or password incorrect');
    }
    return user;
  }
}

import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseBooleanPipe implements PipeTransform {
  transform(value: any) {
    if (value === undefined || value === null) return value;

    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new BadRequestException('Validation failed: Expected a boolean value');
  }
}
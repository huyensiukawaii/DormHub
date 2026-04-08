import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

export function IsStudentCodeInRange(
  min: number,
  max: number,
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isStudentCodeInRange',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          const trimmed = value.trim();
          if (!/^\d+$/.test(trimmed)) return false;

          const num = Number(trimmed);
          if (!Number.isSafeInteger(num)) return false;

          return num >= min && num <= max;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} phải nằm trong khoảng ${min} đến ${max}`;
        },
      },
    });
  };
}

import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthorizationService } from '../auth/authorization.service';
import { DataScopeService } from '../auth/data-scope.service';
import { Reflector } from '@nestjs/core';

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: AuthorizationService,
          useValue: {
            getUserEffectiveAccess: jest.fn(),
          },
        },
        {
          provide: DataScopeService,
          useValue: {
            resolveDataScope: jest.fn(),
            buildStudentScopeFilter: jest.fn(),
          },
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

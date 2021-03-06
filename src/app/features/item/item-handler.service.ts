import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { HandlerService } from '@keira-abstract/service/handlers/handler.service';
import { ItemTemplate } from '@keira-types/item-template.type';

@Injectable()
export class ItemHandlerService extends HandlerService<ItemTemplate> {
  /* istanbul ignore next */ // because of: https://github.com/gotwarlost/istanbul/issues/690
  constructor(
    protected router: Router,
  ) {
    super(
      'item/item-template',
      router,
    );
  }
}

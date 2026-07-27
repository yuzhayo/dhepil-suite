import type { HeaderViewModel, UiActionViewModel } from '../view-models';

export interface HeaderPresenterContext {
  actions?: readonly UiActionViewModel[];
}

export function createHeaderViewModel(context: HeaderPresenterContext = {}): HeaderViewModel {
  return {
    actions: context.actions ? [...context.actions] : [],
  };
}

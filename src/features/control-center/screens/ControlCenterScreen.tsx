import { useControlCenterController } from '../application/controller/useControlCenterController';
import { ControlCenterLayout } from '../../../../ui/ControlCenterLayout';

export function ControlCenterScreen() {
  const controller = useControlCenterController();

  return <ControlCenterLayout viewModel={controller.viewModel} onAction={controller.dispatch} />;
}

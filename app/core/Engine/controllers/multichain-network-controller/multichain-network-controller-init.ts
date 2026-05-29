import {
  MultichainNetworkController,
  MultichainNetworkControllerMessenger,
  MultichainNetworkControllerState,
} from '@metamask/multichain-network-controller';
import { ControllerInitFunction, ControllerInitRequest } from '../../types';
import { MultichainNetworkServiceInit } from './multichain-network-service-init';

/**
 * Initialize the MultichainNetworkController.
 *
 * @param request - The request object.
 * @returns The MultichainNetworkController.
 */
export const multichainNetworkControllerInit = ({
  controllerMessenger,
  persistedState,
}: ControllerInitRequest<MultichainNetworkControllerMessenger>): ReturnType<
  ControllerInitFunction<
    MultichainNetworkController,
    MultichainNetworkControllerMessenger
  >
> => {
  const networkService = MultichainNetworkServiceInit();
  const multichainNetworkControllerState =
    persistedState.MultichainNetworkController as MultichainNetworkControllerState;

  // [ArbiEver] 비-EVM 네트워크(Bitcoin / Solana / Tron 등) 의 default 자동 추가를 차단.
  // multichainNetworkConfigurationsByChainId 를 빈 객체로 강제 → 첫 페이지/계정 생성 시
  // BTC·SOL·TRX 등이 표시되지 않음. 받는 주소 모달은 셀렉터에서 추가로 막혀 있음.
  const initialState = (multichainNetworkControllerState ??
    {}) as MultichainNetworkControllerState;
  const sanitizedState = {
    ...initialState,
    multichainNetworkConfigurationsByChainId: {},
  } as MultichainNetworkControllerState;

  const controller = new MultichainNetworkController({
    messenger: controllerMessenger,
    state: sanitizedState,
    networkService,
  });

  return { controller };
};

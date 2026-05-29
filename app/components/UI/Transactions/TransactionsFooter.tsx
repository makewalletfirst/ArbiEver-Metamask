import React from 'react';
import { View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import type { Theme } from '@metamask/design-tokens';
import { strings } from '../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import Text, {
  getFontFamily,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { NO_RPC_BLOCK_EXPLORER, RPC } from '../../../constants/network';
import {
  getBlockExplorerName,
  isMainnetByChainId,
} from '../../../util/networks';
import { useTheme } from '../../../util/theme';

interface Styles {
  viewMoreWrapper: ViewStyle;
  viewMoreButton: ViewStyle;
  disclaimerWrapper: ViewStyle;
  disclaimerText: TextStyle;
}

const createStyles = (
  colors: Theme['colors'],
  typography: Theme['typography'],
): Styles =>
  StyleSheet.create({
    viewMoreWrapper: {
      padding: 16,
    },
    viewMoreButton: {
      width: '100%',
    },
    disclaimerWrapper: {
      padding: 16,
    },
    disclaimerText: {
      color: colors.text.default,
      ...typography.sBodySM,
      fontFamily: getFontFamily(TextVariant.BodySM),
    } as TextStyle,
  });

interface TransactionsFooterProps {
  /**
   * Chain ID for block explorer links
   */
  chainId?: string;
  /**
   * Provider type (mainnet, rpc, etc.)
   */
  providerType?: string;
  /**
   * RPC block explorer URL
   */
  rpcBlockExplorer?: string;
  /**
   * Whether this is a non-EVM chain
   */
  isNonEvmChain?: boolean;
  /**
   * Handler for view block explorer button press
   */
  onViewBlockExplorer: () => void;
  /**
   * Whether to show disclaimer footer
   */
  showDisclaimer?: boolean;
}

const TransactionsFooter = ({
  chainId,
  providerType,
  rpcBlockExplorer,
  isNonEvmChain = false,
  onViewBlockExplorer,
  showDisclaimer = true,
}: TransactionsFooterProps) => {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);

  const getBlockExplorerText = (): string | null => {
    if (isNonEvmChain) {
      if (rpcBlockExplorer && rpcBlockExplorer !== NO_RPC_BLOCK_EXPLORER) {
        return `${strings(
          'transactions.view_full_history_on',
        )} ${getBlockExplorerName(rpcBlockExplorer)}`;
      }
      return null;
    }

    // [ArbiEver] 0x8db9f (=580511) 인 ArbiEver L2 는 별도 라벨/URL 사용
    if (chainId === '0x8db9f') {
      return strings('transactions.view_full_history_on_arbieverscan');
    }
    if (isMainnetByChainId(chainId) || (providerType && providerType !== RPC)) {
      return strings('transactions.view_full_history_on_etherscan');
    }

    if (rpcBlockExplorer && rpcBlockExplorer !== NO_RPC_BLOCK_EXPLORER) {
      return `${strings(
        'transactions.view_full_history_on',
      )} ${getBlockExplorerName(rpcBlockExplorer)}`;
    }

    return null;
  };

  const blockExplorerText = getBlockExplorerText();

  return (
    <View>
      {blockExplorerText && rpcBlockExplorer && (
        <View style={styles.viewMoreWrapper}>
          <Button
            variant={ButtonVariants.Link}
            size={ButtonSize.Lg}
            label={blockExplorerText}
            style={styles.viewMoreButton}
            onPress={onViewBlockExplorer}
          />
        </View>
      )}
      {showDisclaimer && (
        <View style={styles.disclaimerWrapper}>
          <Text style={styles.disclaimerText}>
            {strings('asset_overview.disclaimer')}
          </Text>
        </View>
      )}
    </View>
  );
};

export default TransactionsFooter;

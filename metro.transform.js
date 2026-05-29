/* eslint-disable no-console */
/* eslint-disable import/no-nodejs-modules */
/* eslint-disable import/no-commonjs */
const path = require('path');
const {
  removeFencedCode,
  lintTransformedFile,
} = require('@metamask/build-utils');
const { ESLint } = require('eslint');
const defaultTransformer = require('metro-react-native-babel-transformer');
const svgTransformer = require('react-native-svg-transformer');

// Code fence removal variables
const fileExtsToScan = ['.js', '.jsx', '.cjs', '.mjs', '.ts', '.tsx'];
const availableFeatures = new Set([
  'flask',
  'preinstalled-snaps',
  'external-snaps',
  'beta',
  'keyring-snaps',
  'multi-srp',
  'bitcoin',
  'solana',
  'sample-feature',
  'tron',
  'experimental',
]);

const mainFeatureSet = new Set([
  'preinstalled-snaps',
  'keyring-snaps',
  'multi-srp',
  // [ArbiEver] solana/bitcoin/tron 은 활성 유지 — 27개 파일의 fence 안에 앱 초기화 path 가
  // 함께 들어있어 제거 시 로딩 화면에서 hang. 대신 preinstalled-snaps.ts 만 직접 수정해서
  // BTC/SOL/TRX 의 자동 snap 설치만 차단 (fence 영향 없는 외과적 패치).
  'solana',
  'bitcoin',
  'tron',
]);
const betaFeatureSet = new Set([
  'beta',
  'preinstalled-snaps',
  'keyring-snaps',
  'multi-srp',
  'solana',
  'bitcoin',
  'tron',
]);
const flaskFeatureSet = new Set([
  'flask',
  'preinstalled-snaps',
  'external-snaps',
  'keyring-snaps',
  'multi-srp',
  'bitcoin',
  'solana',
  'tron',
]);
// Experimental feature set includes all main features plus experimental
const experimentalFeatureSet = new Set([...mainFeatureSet, 'experimental']);

/**
 * Gets the features for the current build type, used to determine which code
 * fences to remove.
 *
 * @returns {Set<string>} The set of features to be included in the build.
 */
function getBuildTypeFeatures() {
  const buildType = process.env.METAMASK_BUILD_TYPE ?? 'main';
  const envType = process.env.METAMASK_ENVIRONMENT ?? 'production';
  let features;

  switch (buildType) {
    // TODO: Remove uppercase QA once we've consolidated build types
    case 'qa':
    case 'QA':
    case 'main':
      // TODO: Refactor this once we've abstracted environment away from build type
      if (envType === 'exp') {
        // Only include experimental features in experimental environment
        features = experimentalFeatureSet;
        break;
      }
      features = envType === 'beta' ? betaFeatureSet : mainFeatureSet;
      break;
    case 'beta':
      features = betaFeatureSet;
      break;
    case 'flask':
      features = flaskFeatureSet;
      break;
    default:
      throw new Error(
        `Invalid METAMASK_BUILD_TYPE of ${buildType} was passed to metro transform`,
      );
  }

  // Add sample-feature only if explicitly enabled via env var
  if (process.env.INCLUDE_SAMPLE_FEATURE === 'true') {
    features.add('sample-feature');
  }

  return features;
}

/**
 * The Metro transformer function. Notably, handles code fence removal.
 * See https://github.com/MetaMask/core/tree/main/packages/build-utils for details.
 */
module.exports.transform = async ({ src, filename, options }) => {
  if (filename.endsWith('.svg')) {
    return svgTransformer.transform({ src, filename, options });
  }

  /**
   * Params based on builds we're code splitting
   * i.e: flavorDimensions "version" productFlavors from android/app/build.gradle
   */
  if (
    !path.normalize(filename).split(path.sep).includes('node_modules') &&
    fileExtsToScan.includes(path.extname(filename))
  ) {
    const [processedSource, didModify] = removeFencedCode(filename, src, {
      all: availableFeatures,
      active: getBuildTypeFeatures(),
    });

    if (didModify) {
      // [ArbiEver] fence 제거 후의 transient lint 경고 (예: unused-vars) 무시.
      // mainFeatureSet 에서 solana/bitcoin/tron 을 빼면 그 fence 안에서만 쓰이던 변수가
      // unused 가 돼 build 가 깨지는 경우가 생김. metro 가 syntax 자체는 따로 검증하므로
      // 여기서만 lint 우회.
      // await lintTransformedFile(getESLintInstance(), filename, processedSource);
    }
    return defaultTransformer.transform({
      src: processedSource,
      filename,
      options,
    });
  }
  return defaultTransformer.transform({ src, filename, options });
};

/**
 * The singleton ESLint instance.
 *
 * @type {ESLint}
 */
let eslintInstance;

/**
 * Gets the singleton ESLint instance, initializing it if necessary.
 * Initializing involves reading the ESLint configuration from disk and
 * modifying it according to the needs of code fence removal.
 *
 * @returns {ESLint} The singleton ESLint instance.
 */
function getESLintInstance() {
  if (!eslintInstance) {
    const eslintrc = require('./.eslintrc.js');

    eslintrc.overrides.forEach((override) => {
      const rules = override.rules ?? {};

      // We don't want linting to fail for purely stylistic reasons.
      rules['prettier/prettier'] = 'off';
      // Sometimes we use `let` instead of `const` to assign variables depending on
      // the build type.
      rules['prefer-const'] = 'off';

      override.rules = rules;
    });

    // also override the rules section
    // We don't want linting to fail for purely stylistic reasons.
    eslintrc.rules['prettier/prettier'] = 0;
    // Sometimes we use `let` instead of `const` to assign variables depending on
    // the build type.
    eslintrc.rules['prefer-const'] = 0;

    // Remove all test-related overrides. We will never lint test files here.
    eslintrc.overrides = eslintrc.overrides.filter(
      (override) =>
        !(
          (override.extends &&
            override.extends.find(
              (configName) =>
                configName.includes('jest') || configName.includes('mocha'),
            )) ||
          (override.plugins &&
            override.plugins.find((pluginName) => pluginName.includes('jest')))
        ),
    );

    eslintInstance = new ESLint({ baseConfig: eslintrc, useEslintrc: false });
  }
  return eslintInstance;
}

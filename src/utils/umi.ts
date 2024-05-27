import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createLighthouseProgram } from 'lighthouse-sdk-legacy';

export const UMI = createUmi('https://api.devnet.solana.com');
UMI.programs.add(createLighthouseProgram());

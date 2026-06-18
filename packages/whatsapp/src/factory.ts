import { WhatsAppProviderKind } from '@vibesphere/shared';
import { WhatsAppProvider } from './provider';
import { MetaCloudCredentials, MetaCloudProvider } from './providers/meta-cloud.provider';

export interface WhatsAppProviderConfig {
  kind: WhatsAppProviderKind | string;
  credentials: MetaCloudCredentials & Record<string, unknown>;
}

/**
 * Resolve o provider de WhatsApp a partir da config do canal — Requisito 7.1.
 * MVP suporta Meta Cloud; Evolution/Baileys entram nas próximas fases.
 */
export class WhatsAppProviderFactory {
  static create(config: WhatsAppProviderConfig): WhatsAppProvider {
    switch (config.kind) {
      case WhatsAppProviderKind.META_CLOUD:
        return new MetaCloudProvider(config.credentials);
      // TODO Fase 2: EvolutionProvider, BaileysProvider
      default:
        throw new Error(`Provider de WhatsApp não suportado: ${config.kind}`);
    }
  }
}

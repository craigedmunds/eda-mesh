import {
  ScmIntegrationsApi,
  scmIntegrationsApiRef,
  ScmAuth,
} from '@backstage/integration-react';
import {
  AnyApiFactory,
  configApiRef,
  createApiFactory,
  discoveryApiRef,
  fetchApiRef,
  githubAuthApiRef,
  oauthRequestApiRef,
} from '@backstage/core-plugin-api';
import { GithubAuth } from '@backstage/core-app-api';
import { githubActionsApiRef } from '@backstage/plugin-github-actions';
import { GithubActionsApiClient } from './lib/GithubActionsApiClient';
import { imageFactoryApiRef, ImageFactoryClient } from '@internal/backstage-plugin-image-factory';

export const apis: AnyApiFactory[] = [
  createApiFactory({
    api: scmIntegrationsApiRef,
    deps: { configApi: configApiRef },
    factory: ({ configApi }) => ScmIntegrationsApi.fromConfig(configApi),
  }),
  ScmAuth.createDefaultApiFactory(),
  createApiFactory({
    api: githubAuthApiRef,
    deps: { discoveryApi: discoveryApiRef, oauthRequestApi: oauthRequestApiRef },
    factory: ({ discoveryApi, oauthRequestApi }) =>
      GithubAuth.create({
        discoveryApi,
        oauthRequestApi,
        defaultScopes: ['read:user'],
      }),
  }),
  createApiFactory({
    api: githubActionsApiRef,
    deps: { discoveryApi: discoveryApiRef },
    factory: ({ discoveryApi }) =>
      new GithubActionsApiClient({
        discoveryApi,
      }),
  }),
  createApiFactory({
    api: imageFactoryApiRef,
    deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
    factory: ({ discoveryApi, fetchApi }) =>
      new ImageFactoryClient({
        discoveryApi,
        fetchApi,
      }),
  }),
];

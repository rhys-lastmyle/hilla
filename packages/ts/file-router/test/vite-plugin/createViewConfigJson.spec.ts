import { appendFile, mkdir, rm } from 'node:fs/promises';
import chaiAsPromised from 'chai-as-promised';
import chaiLike from 'chai-like';
import { afterAll, beforeAll, beforeEach, chai, describe, expect, it } from 'vitest';
import { RouteParamType } from '../../src/shared/routeParamType.js';
import type { RouteMeta } from '../../src/vite-plugin/collectRoutesFromFS.js';
import createViewConfigJson from '../../src/vite-plugin/createViewConfigJson.js';
import { createTestingRouteFiles, createTestingRouteMeta, createTmpDir } from '../utils.js';

chai.use(chaiLike);
chai.use(chaiAsPromised);

describe('@vaadin/hilla-file-router', () => {
  describe('createViewConfigJson', () => {
    let tmp: URL;
    let meta: readonly RouteMeta[];
    let layoutOnlyDir: URL;
    let layoutOnlyDirLayout: URL;

    beforeAll(async () => {
      tmp = await createTmpDir();

      layoutOnlyDir = new URL('layout-only/', tmp);
      layoutOnlyDirLayout = new URL('@layout.tsx', layoutOnlyDir);

      await createTestingRouteFiles(tmp);
      await mkdir(layoutOnlyDir, { recursive: true });
      await appendFile(layoutOnlyDirLayout, 'export default function LayoutOnly() {};');
    });

    afterAll(async () => {
      await rm(tmp, { recursive: true, force: true });
    });

    beforeEach(() => {
      meta = [
        ...createTestingRouteMeta(tmp),
        {
          path: 'layout-only',
          layout: layoutOnlyDirLayout,
          children: undefined,
        },
      ];
    });

    it('should generate a JSON representation of the route tree', async () => {
      await expect(createViewConfigJson(meta).then(JSON.parse)).to.eventually.be.like([
        { route: 'about', title: 'About', params: {} },
        {
          route: 'profile',
          params: {},
          children: [
            { route: '', title: 'Profile', params: {} },
            {
              route: 'account',
              title: 'Account',
              params: {},
              children: [
                {
                  route: 'security',
                  params: {},
                  children: [
                    { route: 'password', params: {}, title: 'Password' },
                    { route: 'two-factor-auth', params: {}, title: 'Two Factor Auth' },
                  ],
                },
              ],
            },
            {
              route: 'friends',
              params: {},
              title: 'Friends Layout',
              children: [
                { route: 'list', params: {}, title: 'List' },
                { route: ':user', params: { ':user': RouteParamType.Required }, title: 'User' },
              ],
            },
          ],
        },
        {
          route: 'test',
          params: {},
          children: [
            {
              route: ':optional?',
              title: 'Optional',
              params: { ':optional?': RouteParamType.Optional },
            },
            { route: '*', title: 'Wildcard', params: { '*': RouteParamType.Wildcard } },
            {
              route: 'issue-002378',
              params: {},
              children: [
                {
                  route: ':requiredParam',
                  params: { ':requiredParam': RouteParamType.Required },
                  children: [{ route: 'edit', params: {}, title: 'Issue002378 Required Param' }],
                },
              ],
            },
            { route: 'issue-002571-empty-layout', params: {}, title: 'Issue002571 Empty Layout', children: [] },
            { route: 'issue-002879-config-below', title: 'Config Below', params: {} },
          ],
        },
        {
          route: 'layout-only',
          params: {},
          title: 'Layout Only',
          children: [],
        },
      ]);
    });
  });
});

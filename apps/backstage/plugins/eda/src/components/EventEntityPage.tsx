import { Grid, makeStyles, Typography, CardContent } from '@material-ui/core';
import { EntityLayout } from '@backstage/plugin-catalog';
import { EntityCatalogGraphCard } from '@backstage/plugin-catalog-graph';
import { InfoCard } from '@backstage/core-components';
import { useEntity, EntityRefLink } from '@backstage/plugin-catalog-react';
import { stringifyEntityRef, parseEntityRef } from '@backstage/catalog-model';
import type { EventEntityV1alpha1 } from '@internal/backstage-plugin-eda-common';

import {
  EntityApiDefinitionCard
} from '@backstage/plugin-api-docs';

const useStyles = makeStyles(theme => ({
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    columnGap: theme.spacing(5),
    rowGap: theme.spacing(3),
  },
  label: {
    fontWeight: 'bold',
    textTransform: 'uppercase',
    fontSize: '0.75rem',
    letterSpacing: '0.5px',
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(0.5),
  },
  value: {
    fontSize: '1rem',
    color: theme.palette.text.primary,
  },
  fullWidth: {
    gridColumn: '1 / -1',
  },
}));

const EventAboutCard = () => {
  const classes = useStyles();
  const { entity } = useEntity<EventEntityV1alpha1>();
  
  const description = entity.metadata.description;
  const owner = entity.spec.owner;
  const type = entity.spec.type;
  const lifecycle = entity.spec.lifecycle;
  const system = entity.spec.system;
  const domain = entity.spec?.domain;
  const subdomain = entity.spec?.subdomain;
  const tags = entity.metadata.tags || [];
  const entityNamespace = entity.metadata.namespace || 'default';

  // Helper to normalize entity refs
  const normalizeEntityRef = (ref: string, defaultKind: string) => {
    try {
      const parsed = parseEntityRef(ref, {
        defaultKind,
        defaultNamespace: entityNamespace,
      });
      return stringifyEntityRef(parsed);
    } catch {
      return ref;
    }
  };

  return (
    <InfoCard title="About" variant="gridItem">
      <CardContent>
        <div className={classes.fullWidth}>
          <Typography className={classes.label}>Description</Typography>
          <Typography className={classes.value}>
            {description || 'No description'}
          </Typography>
        </div>
        
        <div className={classes.gridContainer} style={{ marginTop: 24 }}>
          <div>
            <Typography className={classes.label}>Owner</Typography>
            <Typography className={classes.value}>
              {owner ? (
                <EntityRefLink entityRef={normalizeEntityRef(owner, 'group')} />
              ) : (
                'No Owner'
              )}
            </Typography>
          </div>
          
          <div>
            <Typography className={classes.label}>Type</Typography>
            <Typography className={classes.value}>{type}</Typography>
          </div>
          
          <div>
            <Typography className={classes.label}>Lifecycle</Typography>
            <Typography className={classes.value}>{lifecycle}</Typography>
          </div>
          
          {system && (
            <div>
              <Typography className={classes.label}>System</Typography>
              <Typography className={classes.value}>
                <EntityRefLink entityRef={normalizeEntityRef(system, 'system')} />
              </Typography>
            </div>
          )}
          
          {domain && (
            <div>
              <Typography className={classes.label}>Domain</Typography>
              <Typography className={classes.value}>
                <EntityRefLink entityRef={normalizeEntityRef(domain, 'domain')} />
              </Typography>
            </div>
          )}
          
          {subdomain && (
            <div>
              <Typography className={classes.label}>Subdomain</Typography>
              <Typography className={classes.value}>
                <EntityRefLink entityRef={normalizeEntityRef(subdomain, 'domain')} />
              </Typography>
            </div>
          )}
        </div>
        
        <div style={{ marginTop: 24 }}>
          <Typography className={classes.label}>Tags</Typography>
          <Typography className={classes.value}>
            {tags.length > 0 ? tags.join(', ') : 'No Tags'}
          </Typography>
        </div>
      </CardContent>
    </InfoCard>
  );
};

/** Entity page layout for Event kind */
export const EntityEventPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3}>
        <Grid item md={6}>
          <EventAboutCard />
        </Grid>
        <Grid item md={6} xs={12}>
          <EntityCatalogGraphCard variant="gridItem" height={400} />
        </Grid>
        <Grid item xs={12}>
          <EntityApiDefinitionCard />
        </Grid>
      </Grid>
    </EntityLayout.Route>
    <EntityLayout.Route path="/definition" title="Definition">
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <EntityApiDefinitionCard />
        </Grid>
      </Grid>
    </EntityLayout.Route>
  </EntityLayout>
);

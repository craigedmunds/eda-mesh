import { Card, CardContent, CardHeader, Grid } from '@material-ui/core';
import { CodeSnippet, EmptyState } from '@backstage/core-components';
import { EntityAboutCard, EntityLayout } from '@backstage/plugin-catalog';
import { EntityCatalogGraphCard } from '@backstage/plugin-catalog-graph';
import { useEntity } from '@backstage/plugin-catalog-react';

import {
  EntityApiDefinitionCard
} from '@backstage/plugin-api-docs';

const EventDefinitionCard = () => {
  const { entity } = useEntity();
  const definition = entity?.spec?.definition as string | undefined;

  if (!definition) {
    return (
      <EmptyState
        missing="info"
        title="No definition found"
        description="This event does not contain an asyncapi definition."
      />
    );
  }

  return (
    <Card>
      <CardHeader title="Event Definition" />
      <CardContent>
        <CodeSnippet language="yaml" text={definition} showLineNumbers />
      </CardContent>
    </Card>
  );
};

/** Entity page layout for Event kind */
export const EntityEventPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3}>
        <Grid item md={6}>
          <EntityAboutCard />
        </Grid>
        <Grid item md={6} xs={12}>
          <EntityCatalogGraphCard variant="gridItem" height={400} />
        </Grid>
        <Grid item xs={12}>
          <EventDefinitionCard />
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

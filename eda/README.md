# Event-Driven Architecture (EDA) Capability

## Overview

The EDA capability provides a comprehensive event-driven architecture platform that enables loose coupling between services through asynchronous messaging patterns. It includes event producers, consumers, platform services, and line-of-business applications.

## Components

### Mesh (`mesh/`)
Event-driven business logic organized by responsibility:

- **Producers** (`producers/`): Services that generate and publish events
- **Consumers** (`consumers/`): Services that subscribe to and process events
- **Services** (`services/`): Platform services that facilitate event processing
- **LOBs** (`lobs/`): Line-of-business applications that participate in event flows

### Infrastructure (`kustomize/`)
Kubernetes configurations for EDA platform:

- **Mesh** (`mesh/`): Core EDA mesh infrastructure
- **Confluent** (`confluent/`): Kafka platform for event streaming
- **Camel Karavan** (`camel-karavan/`): Visual integration designer

### Helm Charts (`helm/`)
Packaged deployments for EDA components:

- **Mesh Consumer** (`mesh-consumer/`): Consumer service templates
- **Mesh LOB** (`mesh-lob/`): Line-of-business service templates
- **Mesh LOB Service** (`mesh-lob-service/`): Individual LOB service charts
- **JBang Camel Integration** (`jbang-camel-integration/`): Camel integration runtime

## Key Features

- **Event Streaming**: Apache Kafka via Confluent platform
- **Visual Integration**: Camel Karavan for designing integration flows
- **Service Mesh**: RabbitMQ for reliable message delivery
- **Microservices**: JBang-based Camel integrations
- **GitOps**: Kubernetes-native deployment patterns

## Architecture Patterns

### Event Flow
```
[Producer] → [Event Bus] → [Platform Services] → [Consumers]
     ↓
[Line of Business Applications]
```

### Messaging Infrastructure
- **Kafka**: High-throughput event streaming
- **RabbitMQ**: Reliable message queuing
- **Camel**: Enterprise integration patterns

## Deployment

### Full EDA Platform
```bash
# Deploy complete EDA infrastructure
kubectl apply -k eda/kustomize/mesh

# Deploy Confluent Kafka platform
kubectl apply -k eda/kustomize/confluent

# Deploy Camel Karavan designer
kubectl apply -k eda/kustomize/camel-karavan
```

### Individual Services
```bash
# Deploy consumer service
helm install my-consumer eda/helm/mesh-consumer

# Deploy LOB service
helm install my-lob eda/helm/mesh-lob-service
```

## Configuration

### Event Producers
Located in `mesh/producers/`, organized by domain:
```
producers/
├── demo/
│   ├── user-created/
│   └── user-updated/
```

### Event Consumers
Located in `mesh/consumers/`, with subscription definitions:
```yaml
# consumers/my-service/subscriptions.yaml
apiVersion: v1
kind: Subscription
metadata:
  name: user-events
spec:
  topics:
    - user.created
    - user.updated
  handler: user-event-handler
```

### Platform Services
Located in `mesh/services/`, providing shared functionality:
```
services/
├── my-simple-http-service/
│   ├── charts/
│   ├── values.yaml
│   └── kustomization.yaml
```

## Integration Points

- **Backstage**: Service catalog and documentation
- **Kargo**: GitOps deployment pipelines
- **Monitoring**: Prometheus metrics and Grafana dashboards
- **Security**: External Secrets Operator for secret management

## Development

### Adding Event Producers
1. Create producer directory under `mesh/producers/domain/`
2. Define event schemas and publishing logic
3. Configure Kafka topics and partitioning
4. Add monitoring and health checks

### Adding Event Consumers
1. Create consumer directory under `mesh/consumers/`
2. Define subscription configuration
3. Implement event processing logic
4. Configure error handling and retry policies

### Creating Platform Services
1. Use service template from `mesh/services/`
2. Implement service logic with Camel or custom code
3. Configure Helm chart for deployment
4. Add to Kustomize overlay for environment deployment

## Monitoring and Observability

### Metrics
- **Kafka**: Topic throughput, consumer lag, partition metrics
- **RabbitMQ**: Queue depth, message rates, connection health
- **Camel**: Route processing times, error rates

### Logging
- **Structured Logging**: JSON format for all services
- **Correlation IDs**: End-to-end request tracing
- **Event Audit**: Complete event lifecycle tracking

### Health Checks
- **Liveness Probes**: Service availability
- **Readiness Probes**: Service readiness to handle traffic
- **Dependency Checks**: External service connectivity

## Troubleshooting

### Common Issues
- **Consumer Lag**: Check processing capacity and scaling
- **Message Loss**: Verify acknowledgment patterns
- **Connection Issues**: Check network policies and credentials

### Debugging Tools
```bash
# Check Kafka topics
kubectl exec -it kafka-0 -- kafka-topics --list

# View RabbitMQ queues
kubectl port-forward svc/rabbitmq 15672:15672

# Monitor Camel routes
kubectl logs -f deployment/camel-integration
```

## Related Documentation

- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [Apache Camel Documentation](https://camel.apache.org/manual/)
- [RabbitMQ Documentation](https://www.rabbitmq.com/documentation.html)
- [Confluent Platform](https://docs.confluent.io/)
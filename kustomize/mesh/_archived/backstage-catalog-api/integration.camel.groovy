// camel run catalog-bridge.groovy

import org.apache.camel.Exchange

// ─────────────────────────────────────────────
// REST configuration (platform-http)
// ─────────────────────────────────────────────
restConfiguration()
    .component("platform-http")
    .bindingMode("off")

// ======================================================================
// Endpoint 1: GET /
// Returns a Backstage Location with URLs to each matching ConfigMap
// ======================================================================
rest("/")
    .get()
        .route()
            // Determine the external protocol (Ingress-aware)
            .setProperty("proto").simple(
                "${headers.X-Forwarded-Proto} != null ? " +
                "headers.X-Forwarded-Proto : headers.CamelHttpScheme"
            )

            // Determine the external host
            .setProperty("host").simple(
                "${headers.X-Forwarded-Host} != null ? " +
                "headers.X-Forwarded-Host : headers.Host"
            )

            // List ConfigMaps with selector eda.io/backstage-catalog=true
            .toD("kubernetes-config-maps:///?"
                + "operation=listConfigMaps"
                + "&labelKey=eda.io/backstage-catalog"
                + "&labelValue=true"
                + "&kubernetesClient=#kubernetesClient")

            .process { Exchange ex ->
                def cmList = ex.message.body.items
                def proto  = ex.properties["proto"]
                def host   = ex.properties["host"]

                def targets = []

                cmList.each { cm ->
                    def ns   = cm.metadata.namespace
                    def name = cm.metadata.name
                    targets.add("${proto}://${host}/${ns}/${name}")
                }

                // Build Backstage Location YAML
                def yaml = new StringBuilder()
                yaml.append("apiVersion: backstage.io/v1alpha1\n")
                yaml.append("kind: Location\n")
                yaml.append("spec:\n")
                yaml.append("  targets:\n")
                targets.each { t -> yaml.append("    - ${t}\n") }

                ex.message.body = yaml.toString()
                ex.message.headers["Content-Type"] = "application/yaml"
            }
        .endRest()

// ======================================================================
// Endpoint 2: GET /{namespace}/{configmap}
// Returns concatenated YAML contents of ConfigMap.data
// ======================================================================
rest("/{namespace}/{configmap}")
    .get()
        .route()
            .toD("kubernetes-config-maps:///${header.namespace}/${header.configmap}"
                + "?operation=getConfigMap"
                + "&kubernetesClient=#kubernetesClient")

            .process { Exchange ex ->
                def cm = ex.message.body

                if (!cm?.data) {
                    ex.message.body =
                        "# No data entries found in ConfigMap ${ex.in.headers.configmap}\n"
                    ex.message.headers["Content-Type"] = "application/yaml"
                    return
                }

                def combined = new StringBuilder()
                cm.data.each { k, v -> combined.append(v).append("\n") }

                ex.message.body = combined.toString()
                ex.message.headers["Content-Type"] = "application/yaml"
            }
        .endRest()

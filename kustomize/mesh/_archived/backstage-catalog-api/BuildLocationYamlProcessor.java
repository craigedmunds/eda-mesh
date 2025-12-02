import org.apache.camel.Exchange;
import org.apache.camel.Processor;
import org.apache.camel.component.kubernetes.model.ConfigMapList;

public class BuildLocationYamlProcessor implements Processor {

    @Override
    public void process(Exchange exchange) throws Exception {

        ConfigMapList list = exchange.getMessage().getBody(ConfigMapList.class);
        String proto = exchange.getProperty("proto", String.class);
        String host  = exchange.getProperty("host", String.class);

        StringBuilder sb = new StringBuilder();
        sb.append("apiVersion: backstage.io/v1alpha1\n");
        sb.append("kind: Location\n");
        sb.append("spec:\n");
        sb.append("  targets:\n");

        list.getItems().forEach(cm -> {
            sb.append("    - ").append(proto).append("://").append(host)
              .append("/").append(cm.getMetadata().getNamespace())
              .append("/").append(cm.getMetadata().getName())
              .append("\n");
        });

        exchange.getMessage().setBody(sb.toString());
        exchange.getMessage().setHeader("Content-Type", "application/yaml");
    }
}

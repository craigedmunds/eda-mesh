import org.apache.camel.Exchange;
import org.apache.camel.Processor;
import io.fabric8.kubernetes.api.model.ConfigMap;

public class BuildConfigMapYamlProcessor implements Processor {

    @Override
    public void process(Exchange exchange) throws Exception {

        ConfigMap cm = exchange.getMessage().getBody(ConfigMap.class);

        if (cm.getData() == null || cm.getData().isEmpty()) {
            exchange.getMessage().setBody("# No data found\n");
            exchange.getMessage().setHeader("Content-Type", "application/yaml");
            return;
        }

        StringBuilder sb = new StringBuilder();
        cm.getData().values().forEach(v -> sb.append(v).append("\n"));

        exchange.getMessage().setBody(sb.toString());
        exchange.getMessage().setHeader("Content-Type", "application/yaml");
    }
}

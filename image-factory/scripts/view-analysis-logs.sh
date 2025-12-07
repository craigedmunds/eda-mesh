#!/bin/bash
# Helper script to view AnalysisRun logs

NAMESPACE="image-factory-kargo"

echo "=== Recent Analysis Runs ==="
kubectl get analysisrun -n $NAMESPACE --sort-by=.metadata.creationTimestamp | tail -5

echo ""
echo "=== Recent Analysis Pods ==="
kubectl get pods -n $NAMESPACE --sort-by=.metadata.creationTimestamp | tail -5

echo ""
echo "=== Logs from most recent analysis ==="
LATEST_POD=$(kubectl get pods -n $NAMESPACE --sort-by=.metadata.creationTimestamp -o name | tail -1)
echo "Pod: $LATEST_POD"
echo ""
kubectl logs -n $NAMESPACE $LATEST_POD

echo ""
echo "=== To view logs for a specific analysis run ==="
echo "1. Find the pod name from the list above"
echo "2. Run: kubectl logs -n $NAMESPACE <pod-name>"
echo ""
echo "Example:"
echo "kubectl logs -n $NAMESPACE b455e915-0868-4f7d-97d1-6d762d04dd6d.dockerfile-analysis.1dx8s7"

#!/usr/bin/env bash
set -euo pipefail

REGION="us-east-2"
PROJECT="aurumshield"

echo "========================================"
echo " AurumShield AWS Resource Audit"
echo " Region: ${REGION}"
echo " Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "========================================"

echo ""
echo "--- VPCs ---"
aws ec2 describe-vpcs \
  --region "${REGION}" \
  --filters "Name=tag:Name,Values=*${PROJECT}*" \
  --query "Vpcs[].{VpcId:VpcId,CidrBlock:CidrBlock,State:State,Name:Tags[?Key=='Name']|[0].Value}" \
  --output table 2>/dev/null || echo "  No VPCs found or access denied."

echo ""
echo "--- Subnets ---"
aws ec2 describe-subnets \
  --region "${REGION}" \
  --filters "Name=tag:Name,Values=*${PROJECT}*" \
  --query "Subnets[].{SubnetId:SubnetId,CidrBlock:CidrBlock,AZ:AvailabilityZone,Name:Tags[?Key=='Name']|[0].Value}" \
  --output table 2>/dev/null || echo "  No subnets found or access denied."

echo ""
echo "--- RDS Instances ---"
aws rds describe-db-instances \
  --region "${REGION}" \
  --query "DBInstances[?contains(DBInstanceIdentifier,'${PROJECT}')].{DBInstanceId:DBInstanceIdentifier,Engine:Engine,Status:DBInstanceStatus,Endpoint:Endpoint.Address}" \
  --output table 2>/dev/null || echo "  No RDS instances found or access denied."

echo ""
echo "--- ECS Clusters ---"
aws ecs list-clusters \
  --region "${REGION}" \
  --query "clusterArns[?contains(@,'${PROJECT}')]" \
  --output table 2>/dev/null || echo "  No ECS clusters found or access denied."

echo ""
echo "--- ECR Repositories ---"
aws ecr describe-repositories \
  --region "${REGION}" \
  --query "repositories[?contains(repositoryName,'${PROJECT}')].{Name:repositoryName,URI:repositoryUri,CreatedAt:createdAt}" \
  --output table 2>/dev/null || echo "  No ECR repositories found or access denied."

echo ""
echo "--- S3 Buckets (matching prefix) ---"
aws s3api list-buckets \
  --query "Buckets[?contains(Name,'${PROJECT}')].{Name:Name,Created:CreationDate}" \
  --output table 2>/dev/null || echo "  No matching S3 buckets found or access denied."

echo ""
echo "--- Load Balancers ---"
aws elbv2 describe-load-balancers \
  --region "${REGION}" \
  --query "LoadBalancers[?contains(LoadBalancerName,'${PROJECT}')].{Name:LoadBalancerName,DNS:DNSName,State:State.Code}" \
  --output table 2>/dev/null || echo "  No ALBs found or access denied."

echo ""
echo "========================================"
echo " Audit complete."
echo "========================================"

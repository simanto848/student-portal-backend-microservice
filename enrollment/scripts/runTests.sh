#!/bin/bash

# Comprehensive Test Runner for Enrollment Service
# This script helps run the complete E2E test including seeding and testing

set -e

echo "============================================================"
echo "  Student Portal - Enrollment Service Test Runner"
echo "============================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if services are running
check_service() {
    local service_name=$1
    local service_url=$2
    
    echo -ne "${BLUE}Checking ${service_name}...${NC} "
    
    if curl -s -f "${service_url}/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Running${NC}"
        return 0
    else
        echo -e "${RED}✗ Not Running${NC}"
        return 1
    fi
}

echo -e "${CYAN}Step 1: Checking service availability${NC}"
echo "------------------------------------------------------------"

ACADEMIC_URL=${ACADEMIC_SERVICE_URL:-"http://localhost:8001"}
USER_URL=${USER_SERVICE_URL:-"http://localhost:8007"}
ENROLLMENT_URL=${ENROLLMENT_SERVICE_URL:-"http://localhost:3003"}

academic_running=false
user_running=false
enrollment_running=false

check_service "Academic Service" "$ACADEMIC_URL" && academic_running=true || academic_running=false
check_service "User Service" "$USER_URL" && user_running=true || user_running=false
check_service "Enrollment Service" "$ENROLLMENT_URL" && enrollment_running=true || enrollment_running=false

echo ""

# Check if all services are running
if ! $academic_running || ! $user_running || ! $enrollment_running; then
    echo -e "${RED}ERROR: Not all required services are running!${NC}"
    echo ""
    echo -e "${YELLOW}Please ensure all services are started:${NC}"
    
    if ! $academic_running; then
        echo -e "  ${RED}✗${NC} Academic Service (Port 8001)"
        echo -e "    ${CYAN}→ cd academic && npm start${NC}"
    fi
    
    if ! $user_running; then
        echo -e "  ${RED}✗${NC} User Service (Port 8007)"
        echo -e "    ${CYAN}→ cd user && npm start${NC}"
    fi
    
    if ! $enrollment_running; then
        echo -e "  ${RED}✗${NC} Enrollment Service (Port 3003)"
        echo -e "    ${CYAN}→ cd enrollment && npm start${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}After starting all services, run this script again.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All services are running!${NC}"
echo ""

# Ask user if they want to run seeding
echo -e "${CYAN}Step 2: Data Seeding${NC}"
echo "------------------------------------------------------------"
echo -e "${YELLOW}Do you want to run data seeding?${NC}"
echo "This will create/verify:"
echo "  - CSE Department"
echo "  - Academic Session"
echo "  - 48 Courses (8 semesters)"
echo "  - Session Courses"
echo "  - 5 Teachers"
echo "  - 8 Students"
echo "  - Auto-enrollments for all students in semester 1"
echo ""
read -p "Run seeding? (y/n): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Running seeding script...${NC}"
    cd enrollment
    npm run seed
    cd ..
    echo -e "${GREEN}✓ Seeding completed!${NC}"
else
    echo -e "${YELLOW}⊘ Skipping seeding${NC}"
fi

echo ""

# Ask user if they want to run E2E tests
echo -e "${CYAN}Step 3: E2E Testing${NC}"
echo "------------------------------------------------------------"
echo -e "${YELLOW}Do you want to run E2E tests?${NC}"
echo "This will run 25 comprehensive tests covering:"
echo "  - All CRUD operations"
echo "  - Bulk operations"
echo "  - Query operations"
echo "  - Error handling"
echo "  - Soft delete and restore"
echo ""
read -p "Run E2E tests? (y/n): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Running E2E tests...${NC}"
    cd enrollment
    npm run test:e2e
    test_result=$?
    cd ..
    
    if [ $test_result -eq 0 ]; then
        echo -e "${GREEN}✓ All tests passed!${NC}"
    else
        echo -e "${RED}✗ Some tests failed. Please review the output above.${NC}"
    fi
else
    echo -e "${YELLOW}⊘ Skipping E2E tests${NC}"
fi

echo ""
echo "============================================================"
echo -e "${GREEN}  Test Runner Completed!${NC}"
echo "============================================================"
echo ""
echo "Next steps:"
echo "  - Review test results above"
echo "  - Check enrollment service logs for any errors"
echo "  - Explore the API using the documented endpoints"
echo ""
echo "Documentation: enrollment/README.md"
echo ""

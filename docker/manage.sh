#!/bin/bash

# Live Quran Radio Management Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

check_env() {
    if [ ! -f .env ]; then
        print_error ".env file not found!"
        print_info "Creating .env from .env.example..."
        cp .env.example .env
        print_info "Please edit .env with your Appwrite credentials"
        exit 1
    fi
}

start_all() {
    print_info "Starting all radio streams..."
    docker-compose up -d
    print_success "All streams started!"
    show_status
}

start_stream() {
    local stream=$1
    print_info "Starting ${stream} radio..."
    docker-compose up -d ${stream}-radio
    print_success "${stream} radio started!"
}

stop_all() {
    print_info "Stopping all radio streams..."
    docker-compose down
    print_success "All streams stopped!"
}

stop_stream() {
    local stream=$1
    print_info "Stopping ${stream} radio..."
    docker-compose stop ${stream}-radio
    print_success "${stream} radio stopped!"
}

restart_all() {
    print_info "Restarting all radio streams..."
    docker-compose restart
    print_success "All streams restarted!"
}

restart_stream() {
    local stream=$1
    print_info "Restarting ${stream} radio..."
    docker-compose restart ${stream}-radio
    print_success "${stream} radio restarted!"
}

show_logs() {
    local stream=$1
    if [ -z "$stream" ]; then
        docker-compose logs -f
    else
        docker-compose logs -f ${stream}-radio
    fi
}

show_status() {
    echo ""
    print_info "Stream Status:"
    echo ""
    
    # Check Tafseer
    if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
        print_success "Tafseer Radio: Running"
        echo "  Stream: http://localhost:8000/tafseer"
        echo "  API: http://localhost:3000/api/current"
    else
        print_error "Tafseer Radio: Not running"
    fi
    
    echo ""
    
    # Check Tilawat
    if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
        print_success "Tilawat Radio: Running"
        echo "  Stream: http://localhost:8001/tilawat"
        echo "  API: http://localhost:3001/api/current"
    else
        print_error "Tilawat Radio: Not running"
    fi
    
    echo ""
    
    # Check Translation
    if curl -sf http://localhost:3002/health > /dev/null 2>&1; then
        print_success "Translation Radio: Running"
        echo "  Stream: http://localhost:8002/translation"
        echo "  API: http://localhost:3002/api/current"
    else
        print_error "Translation Radio: Not running"
    fi
    
    echo ""
}

show_current() {
    local stream=$1
    local port
    
    case $stream in
        tafseer)
            port=3000
            ;;
        tilawat)
            port=3001
            ;;
        translation)
            port=3002
            ;;
        *)
            print_error "Invalid stream: $stream"
            exit 1
            ;;
    esac
    
    print_info "Stream info for ${stream}:"
    curl -s http://localhost:${port}/api/info | jq
}

clean_cache() {
    print_info "Cleaning audio cache..."
    rm -rf audio-cache/tafseer/*
    rm -rf audio-cache/tilawat/*
    rm -rf audio-cache/translation/*
    print_success "Cache cleaned!"
}

rebuild() {
    print_info "Rebuilding containers..."
    docker-compose down
    docker-compose build --no-cache
    docker-compose up -d
    print_success "Rebuild complete!"
}

show_help() {
    cat << EOF
Live Quran Radio Management Script

Usage: ./manage.sh [command] [options]

Commands:
    start [stream]      Start all streams or specific stream (tafseer|tilawat|translation)
    stop [stream]       Stop all streams or specific stream
    restart [stream]    Restart all streams or specific stream
    status              Show status of all streams
    logs [stream]       Show logs (all or specific stream)
    current <stream>    Show stream info for stream
    clean               Clean audio cache
    rebuild             Rebuild containers from scratch
    help                Show this help message

Examples:
    ./manage.sh start                    # Start all streams
    ./manage.sh start tafseer            # Start only tafseer stream
    ./manage.sh logs tilawat             # Show tilawat logs
    ./manage.sh current translation      # Show translation stream info
    ./manage.sh status                   # Show status of all streams

EOF
}

# Main script
case "${1:-help}" in
    start)
        check_env
        if [ -z "$2" ]; then
            start_all
        else
            start_stream "$2"
        fi
        ;;
    stop)
        if [ -z "$2" ]; then
            stop_all
        else
            stop_stream "$2"
        fi
        ;;
    restart)
        if [ -z "$2" ]; then
            restart_all
        else
            restart_stream "$2"
        fi
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "$2"
        ;;
    current)
        if [ -z "$2" ]; then
            print_error "Please specify stream: tafseer, tilawat, or translation"
            exit 1
        fi
        show_current "$2"
        ;;
    clean)
        clean_cache
        ;;
    rebuild)
        check_env
        rebuild
        ;;
    help|*)
        show_help
        ;;
esac

#!/bin/bash

# Aya-Expanse MCP Server Setup Script
# Автоматическая установка и настройка системы

set -e  # Exit on any error

echo "🚀 Aya-Expanse MCP Server Setup Script"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Generate random API key
generate_api_key() {
    openssl rand -hex 16 2>/dev/null || head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command_exists node; then
        log_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        log_error "Node.js version 18+ required. Current version: $(node --version)"
        exit 1
    fi
    
    if ! command_exists npm; then
        log_error "npm is not installed."
        exit 1
    fi
    
    log_success "Node.js $(node --version) and npm $(npm --version) are available"
}

# Install Ollama if not present
install_ollama() {
    log_info "Checking Ollama installation..."
    
    if command_exists ollama; then
        log_success "Ollama is already installed: $(ollama --version 2>/dev/null || echo 'version unknown')"
    else
        log_info "Installing Ollama..."
        if [[ "$OSTYPE" == "linux-gnu"* ]] || [[ "$OSTYPE" == "darwin"* ]]; then
            curl -fsSL https://ollama.ai/install.sh | sh
            log_success "Ollama installed successfully"
        else
            log_warning "Automatic Ollama installation not supported on this OS."
            log_info "Please download and install Ollama from: https://ollama.ai/download"
            read -p "Press enter when Ollama is installed..."
        fi
    fi
    
    # Start Ollama service if not running
    log_info "Starting Ollama service..."
    if ! pgrep -x "ollama" > /dev/null; then
        if command_exists systemctl; then
            sudo systemctl start ollama 2>/dev/null || ollama serve &
        else
            ollama serve &
        fi
        sleep 3
    fi
    
    # Check if Ollama is responsive
    local retries=5
    while [ $retries -gt 0 ]; do
        if curl -s http://localhost:11434/api/version >/dev/null 2>&1; then
            log_success "Ollama service is running"
            break
        else
            log_info "Waiting for Ollama service to start... ($retries attempts left)"
            sleep 2
            retries=$((retries - 1))
        fi
    done
    
    if [ $retries -eq 0 ]; then
        log_error "Failed to start Ollama service"
        exit 1
    fi
}

# Download aya-expanse model
download_model() {
    log_info "Checking aya-expanse model..."
    
    if ollama list | grep -q "aya-expanse"; then
        log_success "aya-expanse model is already installed"
    else
        log_info "Downloading aya-expanse model (this may take several minutes)..."
        ollama pull aya-expanse
        log_success "aya-expanse model downloaded successfully"
    fi
}

# Install Node.js dependencies
install_dependencies() {
    log_info "Installing Node.js dependencies..."
    
    # MCP Server dependencies
    if [ -d "aya-mcp-server" ]; then
        log_info "Installing MCP server dependencies..."
        cd aya-mcp-server
        npm install
        cd ..
        log_success "MCP server dependencies installed"
    else
        log_error "aya-mcp-server directory not found"
        exit 1
    fi
    
    # Backend dependencies
    if [ -d "backend" ]; then
        log_info "Installing backend dependencies..."
        cd backend
        npm install
        cd ..
        log_success "Backend dependencies installed"
    else
        log_warning "backend directory not found, skipping..."
    fi
}

# Setup configuration files
setup_configuration() {
    log_info "Setting up configuration files..."
    
    # Generate API keys
    local master_key=$(generate_api_key)
    local client_key=$(generate_api_key)
    local jwt_secret=$(generate_api_key)$(generate_api_key)  # 64 chars for JWT
    
    # Setup MCP server config
    if [ -f "aya-mcp-server/.env.example" ]; then
        log_info "Creating MCP server configuration..."
        cp aya-mcp-server/.env.example aya-mcp-server/.env
        
        # Update .env file
        sed -i.bak "s/your-super-secure-jwt-secret-key-here-min-32-chars/${jwt_secret}/" aya-mcp-server/.env
        sed -i.bak "s/your-master-api-key-here/${master_key}/" aya-mcp-server/.env
        sed -i.bak "s/client-key-1,client-key-2,client-key-3/${client_key}/" aya-mcp-server/.env
        
        rm -f aya-mcp-server/.env.bak
        log_success "MCP server configuration created"
    fi
    
    # Setup backend config
    if [ -f "backend/.env.example" ]; then
        log_info "Creating backend configuration..."
        cp backend/.env.example backend/.env
        
        # Update backend .env file
        sed -i.bak "s/your_aya_mcp_server_api_key_here/${client_key}/" backend/.env
        
        rm -f backend/.env.bak
        log_success "Backend configuration created"
    fi
    
    # Save keys for user
    echo "=== GENERATED API KEYS ===" > api-keys.txt
    echo "Master API Key: ${master_key}" >> api-keys.txt
    echo "Client API Key: ${client_key}" >> api-keys.txt
    echo "JWT Secret: ${jwt_secret}" >> api-keys.txt
    echo "=========================" >> api-keys.txt
    
    log_success "Configuration files created. API keys saved to api-keys.txt"
}

# Test installation
test_installation() {
    log_info "Testing installation..."
    
    # Test Ollama connectivity
    if curl -s http://localhost:11434/api/version >/dev/null 2>&1; then
        log_success "✓ Ollama service is accessible"
    else
        log_error "✗ Ollama service is not accessible"
        return 1
    fi
    
    # Test model availability
    if ollama list | grep -q "aya-expanse"; then
        log_success "✓ aya-expanse model is available"
    else
        log_error "✗ aya-expanse model is not available"
        return 1
    fi
    
    # Test MCP server startup (quick test)
    log_info "Testing MCP server startup..."
    cd aya-mcp-server
    timeout 10 npm start &
    local server_pid=$!
    sleep 5
    
    if kill -0 $server_pid 2>/dev/null; then
        log_success "✓ MCP server starts successfully"
        kill $server_pid 2>/dev/null || true
    else
        log_warning "⚠ MCP server test inconclusive"
    fi
    cd ..
    
    log_success "Installation test completed"
}

# Create startup script
create_startup_script() {
    log_info "Creating startup script..."
    
    cat > start-aya-system.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting Aya-Expanse Translation System"
echo "=========================================="

# Start Ollama if not running
if ! pgrep -x "ollama" > /dev/null; then
    echo "Starting Ollama service..."
    ollama serve &
    sleep 3
fi

# Start MCP Server
echo "Starting Aya-Expanse MCP Server..."
cd aya-mcp-server
npm start &
MCP_PID=$!
cd ..

# Start Backend
echo "Starting Chat Backend..."
cd backend
npm start &
BACKEND_PID=$!
cd ..

echo ""
echo "✅ System started successfully!"
echo ""
echo "Services running:"
echo "  - Ollama: http://localhost:11434"
echo "  - MCP Server: http://localhost:3001"
echo "  - Chat Backend: http://localhost:3000"
echo ""
echo "To start the frontend, run:"
echo "  cd frontend && npm start"
echo ""
echo "To stop the system, press Ctrl+C or run:"
echo "  kill $MCP_PID $BACKEND_PID"
echo ""

# Wait for interrupt
wait
EOF

    chmod +x start-aya-system.sh
    log_success "Startup script created: ./start-aya-system.sh"
}

# Main installation process
main() {
    echo ""
    log_info "Starting Aya-Expanse MCP Server installation..."
    echo ""
    
    # Run installation steps
    check_prerequisites
    install_ollama
    download_model
    install_dependencies
    setup_configuration
    create_startup_script
    test_installation
    
    echo ""
    log_success "🎉 Installation completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Review the generated configuration in api-keys.txt"
    echo "2. Start the system: ./start-aya-system.sh"
    echo "3. Start the frontend: cd frontend && npm start"
    echo "4. Open http://localhost:4200 in your browser"
    echo ""
    echo "Documentation:"
    echo "- Setup guide: ./SETUP_AYA_EXPANSE.md"
    echo "- MCP Server docs: ./aya-mcp-server/README.md"
    echo ""
    echo "Troubleshooting:"
    echo "- Check logs in: aya-mcp-server/logs/"
    echo "- Test Ollama: ollama list"
    echo "- Test MCP server: curl http://localhost:3001/health"
    echo ""
}

# Handle interruption
trap 'log_warning "Installation interrupted by user"; exit 1' INT

# Run main installation
main "$@"
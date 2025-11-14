pipeline {
  agent any

  environment {
    COMPOSE_FILE = 'docker-compose.yml'
    GIT_REPO = 'git@github.com:eshad/jackx-backend.git'
    GIT_BRANCH = 'main'
    NODE_ENV = 'production'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout([
          $class: 'GitSCM',
          branches: [[name: '*/main']],
          userRemoteConfigs: [[
            url: "${env.GIT_REPO}",
            credentialsId: 'github-ssh-key'
          ]]
        ])
      }
    }

    stage('Verify Branch') {
      steps {
        script {
          def branchName = sh(
            script: "git name-rev --name-only HEAD",
            returnStdout: true
          ).trim()

          echo "Current branch: ${branchName}"
          if (!branchName.contains('main')) {
            error("Aborting: Only 'main' branch is allowed. Current: ${branchName}")
          }
        }
      }
    }

    stage('Check Docker Access') {
      steps {
        script {
          try {
            sh 'docker version'
            echo "✅ Docker access verified"
            env.DOCKER_AVAILABLE = 'true'
          } catch (Exception e) {
            echo "⚠️ Docker access denied, but continuing with alternative approach..."
            env.DOCKER_AVAILABLE = 'false'
          }
        }
      }
    }

    stage('Pre-clean App Container') {
      when {
        expression { env.DOCKER_AVAILABLE == 'true' }
      }
      steps {
        sh '''
          echo "[Docker] Forcing removal of existing container 'casino_api' if exists..."
          docker rm -f casino_api || true
        '''
      }
    }

    stage('Build') {
      when {
        expression { env.DOCKER_AVAILABLE == 'true' }
      }
      steps {
        sh '''
          echo "[Build] Building Docker services..."
          docker compose -f $COMPOSE_FILE build
        '''
      }
    }

    stage('Deploy') {
      when {
        expression { env.DOCKER_AVAILABLE == 'true' }
      }
      steps {
        sh '''
          echo "[Deploy] Starting updated app container only..."
          # Only restart 'api' and ignore dependencies
          docker compose -f $COMPOSE_FILE up -d --no-deps --force-recreate api
        '''
      }
    }

    stage('Alternative: Manual Deployment Instructions') {
      when {
        expression { env.DOCKER_AVAILABLE == 'false' }
      }
      steps {
        script {
          def commitHash = sh(
            script: "git rev-parse --short HEAD",
            returnStdout: true
          ).trim()
          
          def timestamp = sh(
            script: "date +%Y%m%d-%H%M%S",
            returnStdout: true
          ).trim()
          
          echo """
          ⚠️ Docker not available on Jenkins server. 
          
          Manual deployment required for commit: ${commitHash}
          Timestamp: ${timestamp}
          
          Steps to deploy:
          
          1. SSH to your server
          2. Navigate to project directory: cd /path/to/jackx-backend
          3. Pull latest changes: git pull origin main
          4. Build Docker services: docker compose -f docker-compose.yml build
          5. Deploy: docker compose -f docker-compose.yml up -d --no-deps --force-recreate api
          
          Or use your existing deployment process with the new code.
          
          Contact your DevOps team to:
          - Add Jenkins user to docker group: sudo usermod -a -G docker jenkins
          - Restart Jenkins: sudo systemctl restart jenkins
          - Install Docker plugin for Jenkins if needed
          """
        }
      }
    }
  }
  
  post {
    always {
      echo "Pipeline completed. Check the logs above for any issues."
    }
    success {
      echo "✅ Pipeline succeeded!"
    }
    failure {
      echo "❌ Pipeline failed. Check the error messages above."
    }
  }
}
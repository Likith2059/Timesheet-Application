pipeline {
  agent any
  environment {
    NODE_VERSION = '20'
  }
  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Backend: Install & Quick Checks') {
      steps {
        dir('backend') {
          sh 'node -v || true'
          sh 'npm ci'
          sh 'npx eslint src/ --ext .js --max-warnings 0 || true'
          sh 'node --check src/server.js || true'
        }
      }
    }

    stage('Frontend: Install & Build') {
      steps {
        dir('frontend') {
          sh 'node -v || true'
          sh 'npm ci'
          sh 'npm run build'
        }
      }
    }

    stage('Docker: Build') {
      steps {
        sh 'docker compose -f docker-compose.yml build'
      }
    }
  }
  post {
    always {
      archiveArtifacts artifacts: 'frontend/dist/**', allowEmptyArchive: true
    }
  }
}

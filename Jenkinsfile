pipeline {
    agent any

    stages {
        stage('Build') {
            steps {
                echo 'Building all services...'
                dir('services') {
                    sh 'chmod +x mvnw'
                    sh './mvnw clean install -DskipTests'
                }
            }
        }
        
        stage('Test') {
            steps {
                echo 'Testing all services...'
                dir('services') {
                    sh './mvnw test'
                }
            }
        }

        stage('Deploy') {
            steps {
                echo 'Deploying with Docker Compose...'
                sh 'docker compose -f docker-compose.yml down || true'
                sh 'docker compose -f docker-compose.yml up -d'
            }
        }
    }

    post {
        always {
            echo '🏁 Pipeline finished'
        }

        success {
            echo '✅ Build, Test, and Deploy succeeded'
        }

        failure {
            echo '❌ Pipeline failed'
        }
    }
}
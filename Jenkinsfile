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
                withCredentials([file(credentialsId: 'buy01-env', variable: 'ENV_FILE')]) {
                    sh '''
                    cp "$ENV_FILE" .env
                    docker compose -f docker-compose.yml down || true
                    docker compose -f docker-compose.yml up -d --build
                    rm -f .env
                  '''
                }
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

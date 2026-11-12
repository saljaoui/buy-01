pipeline {
    agent any

    stages {
        stage('Build') {
            steps {
                echo 'Building all services...'
                dir('services') {
                    if(isUnix()) {
                        sh 'chmod +x mvnw'
                        sh './mvnw clean install -DskipTests'
                    }else {
                        bat 'chmod +x mvnw'
                        bat 'mvnw.cmd clean install -DskipTests'
                    }
                }
            }
        }
        
        stage('Test') {
            steps {
                echo 'Testing all services...'
                dir('services') {
                    if(isUnix()) {
                        sh './mvnw test'
                    }else {
                        bat 'mvnw.cmd test'
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                echo 'Deploying with Docker Compose...'
                if(isUnix()) {
                    sh 'docker compose -f docker-compose.yml down || true'
                    sh 'docker compose -f docker-compose.yml up -d'
                }else {
                    bat 'docker-compose -f docker-compose.yml down || true'
                    bat 'docker-compose -f docker-compose.yml up -d'
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
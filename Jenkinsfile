
pipeline {
    agent any

    stages {
        stage('Debug Java') {
            steps {
                sh '''
                    echo "JAVA_HOME=$JAVA_HOME"
                    java -version
                    ./mvnw -version
                '''
            }
        }
        stage('Build') {
            steps {
                echo 'Building all services...'

                dir('services') {
                    script {
                        if (isUnix()) {
                            sh 'chmod +x mvnw'
                            sh './mvnw clean install -DskipTests'
                        } else {
                            bat 'mvnw.cmd clean install -DskipTests'
                        }
                    }
                }
            }
        }

        stage('Test') {
            steps {
                echo 'Testing all services...'

                dir('services') {
                    script {
                        if (isUnix()) {
                            sh './mvnw test'
                        } else {
                            bat 'mvnw.cmd test'
                        }
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                echo 'Deploying with Docker Compose...'
                withCredentials([
                    string(credentialsId: 'jwt-secret',
                        variable: 'JWT_SECRET'),
                    string(credentialsId: 'jwt-expiration',
                        variable: 'JWT_EXPIRATION'),
                    string(credentialsId: 'gateway-port',
                        variable: 'GATEWAY_PORT'),
                    string(credentialsId: 'frontend-port',
                        variable: 'FRONTEND_PORT')
                ]) {
                    script {
                        if (isUnix()) {
                            sh 'docker compose -f docker-compose.yml down || true'
                            sh 'docker compose -f docker-compose.yml up -d'
                        } else {
                            bat 'docker compose -f docker-compose.yml down'
                            bat 'docker compose -f docker-compose.yml up -d'
                        }
                    }
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

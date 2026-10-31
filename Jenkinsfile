pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    environment {
        NOTIFY_EMAIL    = 'saljaoui1@gmail.com'
        BACKEND_MODULES = 'services infrastructure/discovery-service infrastructure/api-gateway'
    }

    stages {

        stage('Build') {
            steps {
                sh '''
                    for d in $BACKEND_MODULES; do
                        echo "Building $d"
                        (cd "$d" && chmod +x mvnw && ./mvnw -B clean install -DskipTests)
                    done
                '''
            }
        }

        stage('Test backend') {
            steps {
                sh '''
                    for d in $BACKEND_MODULES; do
                        echo "Testing $d"
                        (cd "$d" && ./mvnw -B test)
                    done
                '''
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: '**/target/surefire-reports/*.xml'
                }
            }
        }

        stage('Test frontend') {
            steps {
                dir('frontend') {
                    sh 'npm ci'
                    sh 'npx ng test --watch=false --reporters=default --reporters=junit --output-file=test-results/junit.xml'
                }
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'frontend/test-results/*.xml'
                }
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    for img in $(docker images --format '{{.Repository}}' | grep '^buy-01-' | grep -v jenkins | sort -u); do
                        docker tag "$img:latest" "$img:previous" || true
                    done
                '''
                withCredentials([file(credentialsId: 'buy01-env', variable: 'ENV_FILE')]) {
                    sh '''
                        cp "$ENV_FILE" .env
                        docker compose up -d --build --wait --wait-timeout 300
                    '''
                }
            }
            post {
                unsuccessful {
                    echo 'Deploy failed, rolling back to previous version'
                    withCredentials([file(credentialsId: 'buy01-env', variable: 'ENV_FILE')]) {
                        sh '''
                            cp "$ENV_FILE" .env
                            for img in $(docker images --format '{{.Repository}}:{{.Tag}}' | grep '^buy-01-.*:previous$' | cut -d: -f1); do
                                docker tag "$img:previous" "$img:latest"
                            done
                            docker compose up -d --no-build --wait --wait-timeout 300
                        '''
                    }
                }
            }
        }
    }

    post {
        success {
            emailext to: "${NOTIFY_EMAIL}",
                subject: "✅ SUCCESS: ${JOB_NAME} #${BUILD_NUMBER}",
                body: "Build, tests and deployment succeeded.\n\nDetails: ${BUILD_URL}"
        }
        failure {
            emailext to: "${NOTIFY_EMAIL}",
                subject: "❌ FAILED: ${JOB_NAME} #${BUILD_NUMBER}",
                body: "Pipeline failed. If Deploy failed, the previous version was restored.\n\nLogs: ${BUILD_URL}console",
                attachLog: true
        }
        always {
            sh 'rm -f .env'
        }
    }
}
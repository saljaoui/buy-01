pipeline {
    agent any

    tools {
        jdk 'jdk21'
    }

    stages {

        stage('Git Test') {
            steps {
                bat 'git --version'
            }
        }

        stage('Build') {
            steps {
                bat 'mvn clean package'
            }
        }

        stage('Test') {
            steps {
                bat 'mvn test'
            }
        }

        stage('Run Docker Build') {
            steps {
                bat 'docker build -t buy-01-app .'
            }
        }
    }
}
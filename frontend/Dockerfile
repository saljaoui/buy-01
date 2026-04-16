FROM nginx:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/s/browser /usr/share/nginx/html

EXPOSE 80

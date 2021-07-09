FROM sameersbn/nginx:1.10.3

COPY ./docker/includes/nginx/config /etc/nginx
COPY ./build /usr/share/nginx/html/

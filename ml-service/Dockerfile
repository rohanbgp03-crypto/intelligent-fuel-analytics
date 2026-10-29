FROM python:3.12-slim
WORKDIR /app
COPY ml-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY ml-service ml-service
COPY data data
RUN python ml-service/train.py
RUN useradd --create-home ifca
USER ifca
EXPOSE 8001
CMD ["python","-m","uvicorn","app:app","--app-dir","ml-service","--host","0.0.0.0","--port","8001"]

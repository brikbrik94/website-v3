<?php

require_once 'http.php';
require_method('GET');
header('Content-Type: application/json');
echo json_encode(['status' => 'ok', 'time' => time()]);

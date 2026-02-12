import fs from "fs";
import { execSync } from "child_process";
import readline from "readline";
import chalk from "chalk";
import ora from "ora";
import gradient from "gradient-string";
import figlet from "figlet";

const sleep = ms => new Promise(r => setTimeout(r, ms));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = question =>
  new Promise(resolve => rl.question(question, ans => resolve(ans)));

const run = (cmd, show = false) => {
  try {
    return execSync(cmd, { stdio: show ? "inherit" : "pipe" }).toString();
  } catch (err) {
    throw err;
  }
};

const exists = cmd => {
  try {
    execSync(cmd, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

const banner = () => {
  console.clear();
  console.log(
    gradient(['red', 'blue'])(
      figlet.textSync('GITHUB UPLOAD')
    )
  );
};

(async () => {
  banner();
  console.log(chalk.magentaBright('\n🌱 Iniciando...\n'));
  await sleep(400);

  // 📁 Carpeta
  const folder = await ask('📁 Ruta del proyecto: ');
  if (!fs.existsSync(folder)) {
    console.log(chalk.red('❌ La carpeta no existe'));
    process.exit(1);
  }

  process.chdir(folder);

  // 🌍 Repo
  const repo = await ask('🌍 URL del repositorio: ');
  if (!repo.startsWith('https://github.com/')) {
    console.log(chalk.red('❌ URL inválida'));
    process.exit(1);
  }

  run(`git config --global --add safe.directory "${folder}"`);

  if (!fs.existsSync('.git')) {
    console.log(chalk.cyan('📂 Inicializando repositorio...'));
    run('git init');
  }

  if (exists('git remote get-url origin')) {
    run('git remote remove origin');
  }

  run(`git remote add origin ${repo}`);

  console.log(chalk.cyan('🌾 Agregando archivos...'));
  run('git add .');

  const msg = await ask('📝 Mensaje del commit: ');
  const safeMsg = msg.replace(/"/g, '\\"') || 'Auto commit';

  try {
    run(`git commit -m "${safeMsg}"`);
  } catch {
    console.log(chalk.yellow('⚠ Nada nuevo para commitear'));
  }

  let branch = 'main';
  try {
    branch = run('git symbolic-ref --short HEAD').trim();
  } catch {
    run('git branch -M main');
  }

  console.log(chalk.cyan('\n🚀 Enviando a GitHub...\n'));

  try {
    run(`git push -u origin ${branch}`, true);
    console.log(chalk.green('✔ Proyecto subido correctamente 🎉'));
  } catch {
    console.log(chalk.red('\n❌ Autenticación requerida'));

    const user = await ask('👤 Usuario GitHub: ');
    const token = await ask('🔑 Token PAT: ');

    const tokenUrl = repo.replace(
      'https://',
      `https://${user}:${token}@`
    );

    run(`git remote set-url origin ${tokenUrl}`);
    run(`git push -u origin ${branch}`, true);

    run(`git remote set-url origin ${repo}`);

    console.log(chalk.green('✔ Push exitoso con autenticación'));
  }

  rl.close();
  console.log(chalk.cyan('\n✨ Proceso terminado\n'));
})();
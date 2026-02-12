import fs from "fs";
import { execSync } from "child_process";
import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";
import gradient from "gradient-string";
import figlet from "figlet";

const sleep = ms => new Promise(r => setTimeout(r, ms));

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
      figlet.textSync('GITHUB UPLOAD', {
        horizontalLayout: 'default',
        verticalLayout: 'default'
      })
    )
  );
};

(async () => {
  banner();
  console.log(chalk.magentaBright('\n🌱 Iniciando...\n'));
  await sleep(500);

  const { folder } = await inquirer.prompt({
    name: 'folder',
    message: '📁 Ruta del proyecto:',
    validate: p => fs.existsSync(p) || '❌ La carpeta no existe'
  });

  process.chdir(folder);

  const { repo } = await inquirer.prompt({
    name: 'repo',
    message: '🌍 URL del repositorio:',
    validate: v => v.startsWith('https://github.com/') || 'URL inválida'
  });

  const spinner = ora('⚙️ Preparando entorno...').start();
  run(`git config --global --add safe.directory "${folder}"`);
  spinner.succeed('✅ Entorno listo');

  if (!fs.existsSync('.git')) {
    const s = ora('📂 Inicializando repositorio...').start();
    run('git init');
    s.succeed('✅ Repositorio inicializado');
  }

  if (exists('git remote get-url origin')) {
    run('git remote remove origin');
  }
  run(`git remote add origin ${repo}`);

  const addSpin = ora('🌾 Agregando archivos...').start();
  run('git add .');
  addSpin.succeed('✅ Archivos agregados');

  const { msg } = await inquirer.prompt({
    name: 'msg',
    message: '📝 Mensaje del commit:',
    default: 'Auto commit by Shadow CLI'
  });

  const safeMsg = msg.replace(/"/g, '\\"');

  try {
    run(`git commit -m "${safeMsg}"`);
    console.log(chalk.green('✅ Commit realizado'));
  } catch {
    console.log(chalk.yellow('⚠ Nada nuevo para commitear'));
  }

  let branch = 'main';
  try {
    branch = run('git symbolic-ref --short HEAD').trim();
  } catch {
    run('git branch -M main');
    branch = 'main';
  }

  const push = ora('🚀 Enviando a GitHub...').start();
  try {
    run(`git push -u origin ${branch}`, true);
    push.succeed(chalk.green('✔ Proyecto subido correctamente 🎉'));
  } catch {
    push.fail(chalk.red('❌ Autenticación requerida'));

    const { useToken } = await inquirer.prompt({
      type: 'confirm',
      name: 'useToken',
      message: '🔐 ¿Deseas usar un token personal?'
    });

    if (!useToken) process.exit(1);

    const { user, token } = await inquirer.prompt([
      { name: 'user', message: '👤 Usuario GitHub:' },
      { name: 'token', message: '🔑 Token PAT:' }
    ]);

    const tokenUrl = repo.replace(
      'https://',
      `https://${user}:${token}@`
    );

    run(`git remote set-url origin ${tokenUrl}`);
    run(`git push -u origin ${branch}`, true);

    // 🔒 Restaurar URL limpia (MUY IMPORTANTE)
    run(`git remote set-url origin ${repo}`);

    console.log(chalk.green('✔ Push exitoso con autenticación segura'));
  }

  console.log(chalk.cyan('\n✨ Proceso terminado\n'));
})();
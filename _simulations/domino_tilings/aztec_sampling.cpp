#include "aztec_sampling.h"
#include <cmath>

static std::mt19937 rng(std::random_device{}());

// 2.1  Deterministic preprocessing on weight matrix
std::vector<Matrix> d3p(const MatrixDouble &x1)
{
    int n=x1.size();
    Matrix A(n,std::vector<Cell>(n));
    for(int i=0;i<n;++i) for(int j=0;j<n;++j)
        A[i][j] = (std::fabs(x1[i][j])<1e-9) ? Cell{1.0,1} : Cell{x1[i][j],0};

    std::vector<Matrix> AA; AA.push_back(A);
    int iter=n/2-1;          // n even
    for(int k=0;k<iter;++k){
        int nk=n-2*k-2;
        Matrix C(nk,std::vector<Cell>(nk));
        Matrix &prev = AA[k];
        for(int i=0;i<nk;++i){
            for(int j=0;j<nk;++j){
                int ii=i + 2*(i&1);
                int jj=j + 2*(j&1);
                const Cell &cur=prev[ii][jj];
                const Cell &diag=prev[i+1][j+1];
                const Cell &rt=prev[ii][j+1];
                const Cell &dn=prev[i+1][jj];
                double sum1=cur.flag+diag.flag;
                double sum2=rt.flag+dn.flag;
                double a2,a2s;
                if(std::fabs(sum1-sum2)<1e-9){
                    a2=cur.value*diag.value + rt.value*dn.value;
                    a2s=sum1;
                }else if(sum1<sum2){
                    a2=cur.value*diag.value;
                    a2s=sum1;
                }else{
                    a2=rt.value*dn.value;
                    a2s=sum2;
                }
                if(std::fabs(a2)<1e-9) a2=1e-9;
                C[i][j] = {cur.value/a2, cur.flag - int(a2s)};
            }
        }
        AA.push_back(C);
    }
    return AA;
}

// 2.2  Probabilities for creation step
std::vector<MatrixDouble> probs2(const MatrixDouble &x1)
{
    auto a0 = d3p(x1);
    int n=a0.size();
    std::vector<MatrixDouble> A;
    for(int k=0;k<n;++k){
        Matrix &mat=a0[n-k-1];
        int nk=mat.size();
        int rows=nk/2;
        MatrixDouble C(rows,std::vector<double>(rows,0.0));
        for(int i=0;i<rows;++i)
            for(int j=0;j<rows;++j){
                int i0=i<<1, j0=j<<1;
                int sum1=mat[i0][j0].flag + mat[i0+1][j0+1].flag;
                int sum2=mat[i0+1][j0].flag + mat[i0][j0+1].flag;
                if(sum1>sum2) C[i][j]=0.0;
                else if(sum1<sum2) C[i][j]=1.0;
                else{
                    double prod1=mat[i0+1][j0+1].value * mat[i0][j0].value;
                    double prod2=mat[i0+1][j0].value   * mat[i0][j0+1].value;
                    double d = prod1+prod2; if(std::fabs(d)<1e-9) d=1e-9;
                    C[i][j] = prod1/d;
                }
            }
        A.push_back(C);
    }
    return A;
}

// 2.3  Deletion/slide
MatrixInt delslide(const MatrixInt &x1)
{
    int n=x1.size();
    MatrixInt a0(n+2,std::vector<int>(n+2,0));
    for(int i=0;i<n;++i) for(int j=0;j<n;++j) a0[i+1][j+1]=x1[i][j];

    int half=n/2;
    // deletion
    for(int i=0;i<half;++i) for(int j=0;j<half;++j){
        int i2=i<<1, j2=j<<1;
        if(a0[i2][j2]==1 && a0[i2+1][j2+1]==1){
            a0[i2][j2]=a0[i2+1][j2+1]=0;
        }else if(a0[i2][j2+1]==1 && a0[i2+1][j2]==1){
            a0[i2+1][j2]=a0[i2][j2+1]=0;
        }
    }
    // slide
    for(int i=0;i<=half;++i) for(int j=0;j<=half;++j){
        int i2=i<<1, j2=j<<1;
        if(a0[i2+1][j2+1]==1){ a0[i2][j2]=1; a0[i2+1][j2+1]=0; }
        else if(a0[i2][j2]==1){ a0[i2][j2]=0; a0[i2+1][j2+1]=1; }
        else if(a0[i2+1][j2]==1){ a0[i2][j2+1]=1; a0[i2+1][j2]=0; }
        else if(a0[i2][j2+1]==1){ a0[i2+1][j2]=1; a0[i2][j2+1]=0; }
    }
    return a0;
}

// 2.4  Creation
MatrixInt create(MatrixInt x0, const MatrixDouble &p)
{
    int n=x0.size();
    int half=n/2;
    std::uniform_real_distribution<> dis(0.0,1.0);
    for(int i=0;i<half;++i) for(int j=0;j<half;++j){
        int i2=i<<1, j2=j<<1;
        if(x0[i2][j2]||x0[i2+1][j2]||x0[i2][j2+1]||x0[i2+1][j2+1]) continue;
        bool okL=j==0 || (x0[i2][j2-1]==0 && x0[i2+1][j2-1]==0);
        bool okR=j==half-1 || (x0[i2][j2+2]==0 && x0[i2+1][j2+2]==0);
        bool okD=i==0 || (x0[i2-1][j2]==0 && x0[i2-1][j2+1]==0);
        bool okU=i==half-1 || (x0[i2+2][j2]==0 && x0[i2+2][j2+1]==0);
        if(!(okL&&okR&&okD&&okU)) continue;
        if(dis(rng) < p[i][j]){
            x0[i2][j2]=x0[i2+1][j2+1]=1;         // \ domino
        }else{
            x0[i2+1][j2]=x0[i2][j2+1]=1;         // / domino
        }
    }
    return x0;
}

// 2.5  Main generator
MatrixInt aztecgen(const std::vector<MatrixDouble> &prob)
{
    int stages=prob.size();
    std::uniform_real_distribution<> dis(0.0,1.0);
    MatrixInt A;   // 2×2 start
    if(dis(rng) < prob[0][0][0]) A={{1,0},{0,1}}; else A={{0,1},{1,0}};
    for(int s=1;s<stages;++s){ A=delslide(A); A=create(A,prob[s]); }
    return A;
}